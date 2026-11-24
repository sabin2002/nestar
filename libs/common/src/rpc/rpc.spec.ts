import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { reviveDates, rpcCall } from './rpc-call';
import { toRpcError } from './rpc-exception.filter';

describe('RPC helpers', () => {
	it('revives ISO date strings that came over TCP', () => {
		const data = reviveDates({ createdAt: '2026-11-24T10:00:00.000Z', title: 'Seoul', list: [{ soldAt: '2026-01-01T00:00:00Z' }] });
		expect(data.createdAt).toBeInstanceOf(Date);
		expect(data.list[0].soldAt).toBeInstanceOf(Date);
		expect(data.title).toBe('Seoul');
	});

	it('serialises HttpExceptions and RpcExceptions into { status, message }', () => {
		expect(toRpcError(new BadRequestException('Bad request!'))).toEqual({ status: 400, message: 'Bad request!' });
		expect(toRpcError(new InternalServerErrorException('No data found!'))).toEqual({ status: 500, message: 'No data found!' });
		expect(toRpcError(new RpcException({ status: 404, message: 'missing' }))).toEqual({ status: 404, message: 'missing' });
		expect(toRpcError(new Error('boom'))).toEqual({ status: 500, message: 'boom' });
	});

	it('rpcCall rebuilds the remote exception type and message', async () => {
		const client: any = { send: () => throwError(() => ({ status: 404, message: 'No data found!' })) };
		await expect(rpcCall(client, 'x')).rejects.toBeInstanceOf(NotFoundException);
		await expect(rpcCall(client, 'x')).rejects.toThrow('No data found!');
	});

	it('rpcCall returns data with dates revived', async () => {
		const client: any = { send: () => of({ updatedAt: '2026-11-24T10:00:00.000Z' }) };
		const result = await rpcCall<{ updatedAt: Date }>(client, 'x');
		expect(result.updatedAt).toBeInstanceOf(Date);
	});
});
