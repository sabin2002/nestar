import { Transport, TcpClientOptions } from '@nestjs/microservices';

/**
 * Service registry: every microservice, the injection token its clients use,
 * and the default TCP port. Host/port can be overridden per service with env vars,
 * e.g. MEMBER_SERVICE_HOST=member-service, MEMBER_SERVICE_PORT=4001 (see compose.yaml).
 */
export const MEMBER_SERVICE = 'MEMBER_SERVICE';
export const PROPERTY_SERVICE = 'PROPERTY_SERVICE';
export const COMMUNITY_SERVICE = 'COMMUNITY_SERVICE';
export const SOCIAL_SERVICE = 'SOCIAL_SERVICE';
export const AI_SERVICE = 'AI_SERVICE';

export type ServiceName =
	| typeof MEMBER_SERVICE
	| typeof PROPERTY_SERVICE
	| typeof COMMUNITY_SERVICE
	| typeof SOCIAL_SERVICE
	| typeof AI_SERVICE;

export const DEFAULT_PORTS: Record<ServiceName, number> = {
	MEMBER_SERVICE: 4001,
	PROPERTY_SERVICE: 4002,
	COMMUNITY_SERVICE: 4003,
	SOCIAL_SERVICE: 4004,
	AI_SERVICE: 4005,
};

export const servicePort = (name: ServiceName): number => Number(process.env[`${name}_PORT`] ?? DEFAULT_PORTS[name]);
export const serviceHost = (name: ServiceName): string => process.env[`${name}_HOST`] ?? '127.0.0.1';

export const tcpClientOptions = (name: ServiceName): TcpClientOptions => ({
	transport: Transport.TCP,
	options: { host: serviceHost(name), port: servicePort(name) },
});
