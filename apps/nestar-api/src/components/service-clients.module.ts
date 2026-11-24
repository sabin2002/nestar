import { Global, Module } from '@nestjs/common';
import {
	AI_SERVICE,
	COMMUNITY_SERVICE,
	MEMBER_SERVICE,
	PROPERTY_SERVICE,
	RpcClientsModule,
	SOCIAL_SERVICE,
} from '@app/common';

/** One TCP client per microservice, shared by every resolver in the gateway. */
@Global()
@Module({
	imports: [
		RpcClientsModule.register([MEMBER_SERVICE, PROPERTY_SERVICE, COMMUNITY_SERVICE, SOCIAL_SERVICE, AI_SERVICE]),
	],
	exports: [RpcClientsModule],
})
export class ServiceClientsModule {}
