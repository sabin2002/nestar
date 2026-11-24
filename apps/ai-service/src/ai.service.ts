import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PROPERTY, PROPERTY_SERVICE, rpcCall } from '@app/common';
import { Property } from '@app/common/dto/property/property';
import { AiChatInput, AiChatResult, ChatTurn } from './ai.types';
import { OllamaClient } from './ollama.client';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_TURNS = 8;

/**
 * Nestar AI assistant (retrieval-augmented):
 * 1. ask property-service for listings relevant to the user's message,
 * 2. put them into the system prompt,
 * 3. let the local Ollama model answer using only those listings.
 */
@Injectable()
export class AiService {
	private readonly logger = new Logger('AiService');

	constructor(
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
		private readonly ollama: OllamaClient,
	) {}

	public async chat(input: AiChatInput): Promise<AiChatResult> {
		const message = String(input?.message ?? '').trim().slice(0, MAX_MESSAGE_LENGTH);
		if (!message) throw new BadRequestException('Please type a question for the assistant.');

		let listings: Property[] = [];
		try {
			listings = await rpcCall<Property[]>(this.propertyClient, PROPERTY.FOR_AI, { text: message, limit: 8 });
		} catch (err: any) {
			// The assistant can still answer general questions if property-service is down.
			this.logger.warn(`could not load listings: ${err?.message}`);
		}

		const history = (input.history ?? [])
			.filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && turn.content)
			.slice(-MAX_HISTORY_TURNS);

		const messages: ChatTurn[] = [
			{ role: 'system', content: this.buildSystemPrompt(listings, input.memberNick) },
			...history,
			{ role: 'user', content: message },
		];

		const reply = await this.ollama.chat(messages);
		return {
			reply: reply || "Sorry, I couldn't come up with an answer. Could you rephrase?",
			propertyIds: listings.map((ele) => String(ele._id)),
			model: this.ollama.model,
		};
	}

	private buildSystemPrompt(listings: Property[], memberNick?: string | null): string {
		const catalog = listings.length
			? listings.map((ele, index) => `${index + 1}. ${this.describe(ele)}`).join('\n')
			: '(no matching listings were found)';

		return [
			'You are "Nestar Assistant", the helpful AI assistant of Nestar, a real-estate website for properties in South Korea.',
			'You help visitors find apartments, villas and houses to buy or rent, and answer questions about using the site',
			'(browsing properties, contacting agents, liking listings, the community board and the "My Page" section).',
			memberNick ? `The user is logged in as "${memberNick}".` : 'The user is not logged in.',
			'',
			'Rules:',
			'- Recommend ONLY listings from the list below. Never invent listings, prices, addresses or agents.',
			'- When you mention a listing, include its title, city, price and link exactly as given.',
			'- If nothing fits, say so honestly and suggest changing city, budget, type or number of bedrooms.',
			'- Keep answers short (under 150 words), friendly and practical. Reply in the same language as the user.',
			'- You cannot book viewings or contact agents yourself; tell users to open the listing and contact the agent.',
			'',
			'Listings currently available on Nestar:',
			catalog,
		].join('\n');
	}

	private describe(property: Property): string {
		const deal = [property.propertyRent ? 'for rent' : null, property.propertyBarter ? 'barter possible' : null]
			.filter(Boolean)
			.join(', ');
		const parts = [
			`"${property.propertyTitle}"`,
			`${property.propertyType} in ${property.propertyLocation} (${property.propertyAddress})`,
			`price ${Number(property.propertyPrice).toLocaleString('en-US')}`,
			`${property.propertySquare} m2, ${property.propertyBeds} beds, ${property.propertyRooms} rooms`,
			deal || null,
			property.propertyDesc ? `description: ${String(property.propertyDesc).slice(0, 160)}` : null,
			`link: /property/detail?id=${property._id}`,
		];
		return parts.filter(Boolean).join('; ');
	}
}
