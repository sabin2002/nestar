import {
	BadRequestException,
	ForbiddenException,
	HttpException,
	InternalServerErrorException,
	NotFoundException,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { Message } from '../enums/common.enum';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** JSON over TCP turns Date objects into strings; turn them back so GraphQL's DateTime scalar accepts them. */
export const reviveDates = <T>(value: T): T => {
	if (typeof value === 'string') return (ISO_DATE.test(value) ? new Date(value) : value) as T;
	if (Array.isArray(value)) return value.map((item) => reviveDates(item)) as T;
	if (value && typeof value === 'object' && !(value instanceof Date)) {
		for (const key of Object.keys(value)) (value as any)[key] = reviveDates((value as any)[key]);
	}
	return value;
};

/**
 * Request/response call to another microservice.
 * Errors from the remote service come back as HttpExceptions with the original message and status,
 * so the GraphQL error shown to the frontend is the same as before the split.
 */
export async function rpcCall<TResult = any>(
	client: ClientProxy,
	pattern: string,
	data: unknown = {},
	timeoutMs = Number(process.env.RPC_TIMEOUT_MS ?? 10000),
): Promise<TResult> {
	try {
		const result = await firstValueFrom(client.send<TResult>(pattern, data ?? {}).pipe(timeout(timeoutMs)));
		return reviveDates(result);
	} catch (err: any) {
		if (err instanceof HttpException) throw err;
		if (err?.name === 'TimeoutError') {
			throw new InternalServerErrorException(`Service timeout (${pattern})`);
		}
		if (err?.code === 'ECONNREFUSED') {
			throw new InternalServerErrorException(`Service unavailable (${pattern})`);
		}
		throw toHttpException(Number(err?.status) || 500, err?.message ?? Message.SOMETHING_WENT_WRONG);
	}
}

/** Rebuild the same kind of exception the remote service threw, so GraphQL error codes stay the same. */
const toHttpException = (status: number, message: string): HttpException => {
	switch (status) {
		case 400:
			return new BadRequestException(message);
		case 401:
			return new UnauthorizedException(message);
		case 403:
			return new ForbiddenException(message);
		case 404:
			return new NotFoundException(message);
		case 503:
			return new ServiceUnavailableException(message);
		case 500:
			return new InternalServerErrorException(message);
		default:
			return new HttpException(message, status);
	}
};

/** Fire-and-forget event (no reply expected). Failures are logged, never thrown. */
export function rpcEmit(client: ClientProxy, pattern: string, data: unknown): void {
	client.emit(pattern, data).subscribe({ error: (err) => console.error(`emit ${pattern} failed:`, err?.message ?? err) });
}
