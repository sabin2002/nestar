import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AI, AI_SERVICE, rpcCall } from '@app/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as Websocket from 'ws';
import { AuthService } from '../components/auth/auth.service';
import { Member } from '@app/common/dto/member/member';
import { AI_TIMEOUT_MS } from '../components/ai/ai.resolver';

interface MessagePayload {
	event: string;
	text: string;
	memberData: Member | null;
}

interface AiPayload {
	event: 'aiMessage' | 'aiTyping' | 'aiError';
	text: string;
	propertyIds?: string[];
}

interface ChatTurn {
	role: 'user' | 'assistant';
	content: string;
}

const AI_HISTORY_LIMIT = 8;

interface InfoPayload {
	event: string;
	totalClients: number;
	memberData: Member | null;
	action: string;
}

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketEventsGateway');
	private summaryClient: number = 0;
	private clientAuthMap = new Map<Websocket.WebSocket, Member | null>();
	private messageList: MessagePayload[] = [];
	private aiHistory = new Map<Websocket.WebSocket, ChatTurn[]>(); // private AI conversation per connection
	private aiBusy = new Set<Websocket.WebSocket>();

	constructor(
		private authService: AuthService,
		@Inject(AI_SERVICE) private readonly aiClient: ClientProxy,
	) {}

	@WebSocketServer()
	server!: Server;

	public afterInit(server: Server) {
		this.logger.verbose(`WebSocket Server Initialized & total: [${this.summaryClient}]`);
	}

	private async retrieveAuth(req: any): Promise<Member | null> {
		const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
		const queryToken = requestUrl.searchParams.get('token'); // req ichidagi tokenni olish
		const authorization = req.headers.authorization; // req header ichidagi authorizationni olish
		const headerToken = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1] : undefined; // req header ichidagi tokenni olish
		const token = queryToken ?? headerToken;  // query param dan tokenni olish, agar bo'lmasa header dan olish

		if (!token) {
			this.logger.warn('WebSocket connection has no auth token; connected as Guest');
			return null;
		}

		try {
			return await this.authService.verifyToken(token);
		} catch (error) {
			this.logger.warn(
				`WebSocket token verification failed: ${error instanceof Error ? error.name : 'unknown error'}`,
			);
			return null;
		}
	}

	public async handleConnection(client: Websocket.WebSocket, req: any) { // yangi odam ulandi
		const authMember = await this.retrieveAuth(req); // tokenni tekshirib, memberni olish
		this.summaryClient++; // total clientni oshirish
		this.clientAuthMap.set(client, authMember); // clientni va memberni mapga qo'shish

		const clientNick: string = authMember?.memberNick ?? 'Guest'; // agar member bo'lsa nickni olish, bo'lmasa Guest deb qo'yish
		this.logger.verbose(`Connection [${clientNick}] & total: [${this.summaryClient}]`); // logga yozish

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: authMember,
			action: 'joined',
		};

		this.emitMessage(infoMsg); // all Client send - join
		// CLIENT MESSAGE HISTORY
		client.send(JSON.stringify({ event: 'getMessages', list: this.messageList }));
	}

	public handleDisconnect(client: Websocket.WebSocket) { // odam chiqib ketti
		const authMember = this.clientAuthMap.get(client) ?? null; // clientni mapdan olish, agar bo'lmasa null
		this.summaryClient--; // total clientni kamaytirish
		this.clientAuthMap.delete(client); // clientni mapdan o'chirish
		this.aiHistory.delete(client);
		this.aiBusy.delete(client);

		const clientNick: string = authMember?.memberNick ?? 'Guest'; // agar member bo'lsa nickni olish, bo'lmasa Guest deb qo'yish
		this.logger.verbose(`Disconnection [${clientNick}] & total: [${this.summaryClient}]`); // logga yozish

		const infoMsg: InfoPayload = {
			event: 'info',
			totalClients: this.summaryClient,
			memberData: authMember,
			action: 'left',
		};

		// Client - disconnect
		this.broadcastMessage(client, infoMsg); // ozidan boshqa hammaga xabar boradi
	}

	@SubscribeMessage('message') 
	public async handleMessage(client: any, payload: any): Promise<void> {
		const authMember = this.clientAuthMap.get(client);
		const newMessage: MessagePayload = {
			event: 'message', text: payload,
			memberData: authMember ?? null,
		};

		const clientNick: string = authMember?.memberNick ?? 'Guest';
		this.logger.verbose(`NEW MESSAGE [${clientNick}]: ${payload}`);

		this.messageList.push(newMessage);
		if(this.messageList.length >= 5) this.messageList.splice(0, this.messageList.length - 5); // Keep only the last 5 messages
		this.emitMessage(newMessage);
	}

	/**
	 * AI ASSISTANT: { event: 'ai', data: 'question' }
	 * Only the asking client gets the answer (CLIENT strategy), it is not shown in the public live chat.
	 */
	@SubscribeMessage('ai')
	public async handleAiMessage(client: Websocket.WebSocket, payload: any): Promise<void> {
		const text = String(payload ?? '').trim();
		if (!text) return;
		if (this.aiBusy.has(client)) {
			this.sendToClient(client, { event: 'aiError', text: 'Please wait for the previous answer.' });
			return;
		}

		const authMember = this.clientAuthMap.get(client) ?? null;
		const history = this.aiHistory.get(client) ?? [];
		this.logger.verbose(`AI QUESTION [${authMember?.memberNick ?? 'Guest'}]: ${text}`);

		this.aiBusy.add(client);
		this.sendToClient(client, { event: 'aiTyping', text: '' });
		try {
			const result = await rpcCall<{ reply: string; propertyIds: string[] }>(
				this.aiClient,
				AI.CHAT,
				{ message: text, history, memberNick: authMember?.memberNick ?? null },
				AI_TIMEOUT_MS,
			);
			history.push({ role: 'user', content: text }, { role: 'assistant', content: result.reply });
			this.aiHistory.set(client, history.slice(-AI_HISTORY_LIMIT));
			this.sendToClient(client, { event: 'aiMessage', text: result.reply, propertyIds: result.propertyIds });
		} catch (err: any) {
			this.logger.warn(`AI error: ${err?.message}`);
			this.sendToClient(client, { event: 'aiError', text: err?.message ?? 'AI assistant is not available.' });
		} finally {
			this.aiBusy.delete(client);
		}
	}

	private sendToClient(client: Websocket.WebSocket, message: AiPayload) {
		if (client.readyState === Websocket.OPEN) client.send(JSON.stringify(message));
	}

	private broadcastMessage(sender: Websocket.WebSocket, message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client !== sender && client.readyState === Websocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}

	private emitMessage(message: InfoPayload | MessagePayload) {
		this.server.clients.forEach((client) => {
			if (client.readyState === Websocket.OPEN) {
				client.send(JSON.stringify(message));
			}
		});
	}
};



/**  

MESSAGE RATGET: 
1. Client (only client) faqat ozimizga xabar keladi
2. BroadCast (to all clients except sender) ozimizdan tashqari hammaga habar boradi
3. Emit (to all clients) hammaga birdaniga habar boradi


1. CLIENT   → faqat o'ziga
2. BROADCAST → o'zidan tashqari hammaga
3. EMIT      → hammaga (o'zi ham)
**/
