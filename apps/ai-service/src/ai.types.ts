export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatTurn {
	role: ChatRole;
	content: string;
}

export interface AiChatInput {
	message: string;
	/** previous turns of this conversation (oldest first), kept by the gateway per socket */
	history?: ChatTurn[];
	/** logged-in member's nick, if any, so the assistant can greet them */
	memberNick?: string | null;
}

export interface AiChatResult {
	reply: string;
	/** ids of the listings that were given to the model as context */
	propertyIds: string[];
	model: string;
}
