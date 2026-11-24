import { of, throwError } from 'rxjs';
import { AiService } from './ai.service';
import { OllamaClient } from './ollama.client';

const listing = {
	_id: '665f1c2b9b1e8a0012345678',
	propertyTitle: 'Sunny Haeundae Villa',
	propertyType: 'VILLA',
	propertyLocation: 'BUSAN',
	propertyAddress: 'Haeundae-gu 12',
	propertyPrice: 450000,
	propertySquare: 120,
	propertyBeds: 3,
	propertyRooms: 5,
	propertyRent: false,
	propertyBarter: true,
};

describe('AiService', () => {
	const makeService = (propertyClient: any) => {
		const ollama = { model: 'llama3.2', chat: jest.fn().mockResolvedValue('Try the Sunny Haeundae Villa!') };
		return { service: new AiService(propertyClient, ollama as unknown as OllamaClient), ollama };
	};

	it('puts the matching listings into the system prompt and returns the model reply', async () => {
		const propertyClient = { send: jest.fn().mockReturnValue(of([listing])) };
		const { service, ollama } = makeService(propertyClient);

		const result = await service.chat({
			message: 'villa in Busan with 3 beds',
			history: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }],
			memberNick: 'khoji',
		});

		expect(propertyClient.send).toHaveBeenCalledWith('property.forAi', { text: 'villa in Busan with 3 beds', limit: 8 });
		const messages = ollama.chat.mock.calls[0][0];
		expect(messages[0].role).toBe('system');
		expect(messages[0].content).toContain('"Sunny Haeundae Villa"');
		expect(messages[0].content).toContain('price 450,000');
		expect(messages[0].content).toContain('link: /property/detail?id=665f1c2b9b1e8a0012345678');
		expect(messages[0].content).toContain('logged in as "khoji"');
		expect(messages.slice(1).map((m: any) => m.role)).toEqual(['user', 'assistant', 'user']);
		expect(result).toEqual({ reply: 'Try the Sunny Haeundae Villa!', propertyIds: [listing._id], model: 'llama3.2' });
	});

	it('still answers when property-service is down', async () => {
		const propertyClient = { send: jest.fn().mockReturnValue(throwError(() => ({ code: 'ECONNREFUSED' }))) };
		const { service, ollama } = makeService(propertyClient);
		const result = await service.chat({ message: 'how do I contact an agent?' });
		expect(ollama.chat.mock.calls[0][0][0].content).toContain('(no matching listings were found)');
		expect(result.propertyIds).toEqual([]);
	});

	it('rejects empty questions', async () => {
		const { service } = makeService({ send: jest.fn() });
		await expect(service.chat({ message: '   ' })).rejects.toThrow('Please type a question for the assistant.');
	});
});
