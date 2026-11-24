import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AI } from '@app/common';
import { AiService } from './ai.service';
import type { AiChatInput } from './ai.types';

@Controller()
export class AiController {
	constructor(private readonly aiService: AiService) {}

	@MessagePattern(AI.CHAT)
	chat(@Payload() input: AiChatInput) {
		return this.aiService.chat(input);
	}
}
