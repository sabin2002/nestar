import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ChatTurn } from './ai.types';

/**
 * Minimal client for a local Ollama server (https://ollama.com).
 * Uses the /api/chat endpoint with streaming off.
 *   OLLAMA_URL    default http://127.0.0.1:11434  (http://ollama:11434 in Docker)
 *   OLLAMA_MODEL  default llama3.2  (any model you have pulled with `ollama pull`)
 */
@Injectable()
export class OllamaClient {
	private readonly logger = new Logger('OllamaClient');
	readonly baseUrl = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
	readonly model = process.env.OLLAMA_MODEL ?? 'llama3.2';
	private readonly timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 120000);

	async chat(messages: ChatTurn[]): Promise<string> {
		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: this.model,
					messages,
					stream: false,
					options: { temperature: 0.4, num_predict: 400 },
				}),
				signal: AbortSignal.timeout(this.timeoutMs),
			});
		} catch (err: any) {
			this.logger.error(`Ollama unreachable at ${this.baseUrl}: ${err?.message}`);
			throw new ServiceUnavailableException('AI assistant is offline right now. Please try again later.');
		}

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			this.logger.error(`Ollama error ${response.status}: ${body}`);
			if (response.status === 404) {
				throw new ServiceUnavailableException(`AI model "${this.model}" is not installed. Run: ollama pull ${this.model}`);
			}
			throw new ServiceUnavailableException('AI assistant failed to answer. Please try again.');
		}

		const data: any = await response.json();
		return String(data?.message?.content ?? '').trim();
	}
}
