import { Args, Field, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AI, AI_SERVICE, rpcCall } from '@app/common';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 130000);

@ObjectType()
export class AssistantReply {
	@Field(() => String)
	reply!: string;

	@Field(() => [String])
	propertyIds!: string[];

	@Field(() => String)
	model!: string;
}

/** One-shot access to the AI assistant over GraphQL (the chat widget uses the WebSocket instead). */
@Resolver()
export class AiResolver {
	constructor(@Inject(AI_SERVICE) private readonly aiClient: ClientProxy) {}

	@UseGuards(WithoutGuard)
	@Query(() => AssistantReply)
	public async askAssistant(
		@Args('message') message: string,
		@AuthMember('memberNick') memberNick: string | null,
	): Promise<AssistantReply> {
		console.log('Query: askAssistant');
		return await rpcCall(this.aiClient, AI.CHAT, { message, memberNick }, AI_TIMEOUT_MS);
	}
}
