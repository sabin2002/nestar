import { ArgumentsHost, Catch, HttpException, Logger, RpcExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

export interface RpcErrorPayload {
	status: number;
	message: string;
}

/**
 * Used by every microservice. Turns any thrown error (HttpException, RpcException, plain Error)
 * into a small { status, message } object that travels back over TCP to the caller,
 * where rpcCall() turns it back into an HttpException with the same message.
 */
@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter<unknown> {
	private readonly logger = new Logger('RpcException');

	catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
		const payload = toRpcError(exception);
		if (payload.status >= 500) this.logger.error(`${payload.status} ${payload.message}`);
		return throwError(() => payload);
	}
}

export const toRpcError = (exception: unknown): RpcErrorPayload => {
	if (exception instanceof HttpException) {
		const response = exception.getResponse() as any;
		const message = typeof response === 'string' ? response : response?.message ?? exception.message;
		return { status: exception.getStatus(), message: Array.isArray(message) ? message.join(', ') : String(message) };
	}
	if (exception instanceof RpcException) {
		const error = exception.getError() as any;
		if (error && typeof error === 'object') return { status: error.status ?? 500, message: String(error.message) };
		return { status: 500, message: String(error) };
	}
	if (exception && typeof exception === 'object' && 'status' in exception && 'message' in exception) {
		return { status: Number((exception as any).status) || 500, message: String((exception as any).message) };
	}
	return { status: 500, message: exception instanceof Error ? exception.message : 'Something went wrong!' };
};
