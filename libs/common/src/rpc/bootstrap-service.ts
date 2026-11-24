import { Logger, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllRpcExceptionsFilter } from './rpc-exception.filter';
import { ServiceName, servicePort } from './services';

/** Starts a NestJS microservice listening on TCP. Used by every service's main.ts. */
export async function bootstrapService(module: Type<any>, name: ServiceName): Promise<void> {
	const port = servicePort(name);
	const app = await NestFactory.createMicroservice<MicroserviceOptions>(module, {
		transport: Transport.TCP,
		options: { host: process.env.SERVICE_LISTEN_HOST ?? '0.0.0.0', port },
	});
	app.useGlobalFilters(new AllRpcExceptionsFilter());
	app.enableShutdownHooks();
	await app.listen();
	new Logger(name).log(`listening on TCP port ${port}`);
}
