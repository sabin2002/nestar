import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { ServiceName, tcpClientOptions } from './services';

/** Registers TCP ClientProxy providers for the given services, injectable with @Inject(MEMBER_SERVICE) etc. */
@Module({})
export class RpcClientsModule {
	static register(services: ServiceName[]): DynamicModule {
		const clients = ClientsModule.register(services.map((name) => ({ name, ...tcpClientOptions(name) })));
		return { module: RpcClientsModule, imports: [clients], exports: [clients] };
	}
}
