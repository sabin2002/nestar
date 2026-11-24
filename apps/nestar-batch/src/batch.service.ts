import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MEMBER, MEMBER_SERVICE, PROPERTY, PROPERTY_SERVICE, rpcCall } from '@app/common';

const BATCH_TIMEOUT_MS = 60000;

@Injectable()
export class BatchService {
	constructor(
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
		@Inject(MEMBER_SERVICE) private readonly memberClient: ClientProxy,
	) {}

	public async batchRollback(): Promise<void> {
		await rpcCall(this.propertyClient, PROPERTY.BATCH_ROLLBACK, {}, BATCH_TIMEOUT_MS);
		await rpcCall(this.memberClient, MEMBER.BATCH_ROLLBACK, {}, BATCH_TIMEOUT_MS);
	}

	public async batchTopProperties(): Promise<number> {
		return await rpcCall<number>(this.propertyClient, PROPERTY.BATCH_RANK, {}, BATCH_TIMEOUT_MS);
	}

	public async batchTopAgents(): Promise<number> {
		return await rpcCall<number>(this.memberClient, MEMBER.BATCH_RANK, {}, BATCH_TIMEOUT_MS);
	}

	getHello(): string {
		return 'Welcome to Nestar BATCH server!';
	}
}
