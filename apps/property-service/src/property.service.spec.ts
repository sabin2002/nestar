import { Types } from 'mongoose';
import { of } from 'rxjs';
import { PropertyService } from './property.service';

const ownerId = new Types.ObjectId();
const viewerId = new Types.ObjectId();
const p1 = { _id: new Types.ObjectId(), memberId: ownerId, propertyTitle: 'A' };
const p2 = { _id: new Types.ObjectId(), memberId: ownerId, propertyTitle: 'B' };

const chain = (result: any) => {
	const q: any = {};
	['sort', 'limit', 'lean'].forEach((m) => (q[m] = jest.fn().mockReturnValue(q)));
	q.exec = jest.fn().mockResolvedValue(result);
	return q;
};

describe('PropertyService (cross-service composition)', () => {
	it('getProperties attaches memberData from member-service and meLiked from social-service', async () => {
		const model: any = {
			aggregate: jest.fn().mockReturnValue({ exec: () => Promise.resolve([{ list: [p1, p2], metaCounter: [{ total: 2 }] }]) }),
		};
		const memberClient: any = { send: jest.fn().mockReturnValue(of([{ _id: String(ownerId), memberNick: 'agent1' }])) };
		const socialClient: any = { send: jest.fn().mockReturnValue(of([String(p2._id)])) };
		const service = new PropertyService(model, memberClient, socialClient);

		const result = await service.getProperties(viewerId, { page: 1, limit: 10, search: {} } as any);

		expect(memberClient.send).toHaveBeenCalledWith('member.byIds', [ownerId, ownerId]);
		expect(socialClient.send.mock.calls[0][0]).toBe('like.checkMany');
		expect(result.list[0].memberData?.memberNick).toBe('agent1');
		expect(result.list[0].meLiked).toEqual([]);
		expect(result.list[1].meLiked?.[0].myFavorite).toBe(true);
		expect(result.metaCounter).toEqual([{ total: 2 }]);
	});

	it('guests get empty meLiked without calling social-service', async () => {
		const model: any = { aggregate: () => ({ exec: () => Promise.resolve([{ list: [p1], metaCounter: [] }]) }) };
		const memberClient: any = { send: jest.fn().mockReturnValue(of([])) };
		const socialClient: any = { send: jest.fn() };
		const result = await new PropertyService(model, memberClient, socialClient).getProperties(null, {
			page: 1,
			limit: 10,
			search: {},
		} as any);
		expect(socialClient.send).not.toHaveBeenCalled();
		expect(result.list[0].meLiked).toEqual([]);
	});

	it('getPropertiesForAi turns a chat question into listing filters', async () => {
		const find = jest.fn().mockReturnValue(chain([p1]));
		const service = new PropertyService({ find } as any, {} as any, {} as any);
		await service.getPropertiesForAi({ text: 'I need a 3 bed villa in Busan under 500k for rent', limit: 5 });
		expect(find).toHaveBeenCalledWith({
			propertyStatus: 'ACTIVE',
			propertyLocation: { $in: ['BUSAN'] },
			propertyType: { $in: ['VILLA'] },
			propertyBeds: { $gte: 3 },
			propertyPrice: { $lte: 500000 },
			propertyRent: true,
		});
	});

	it('getPropertiesForAi falls back to top listings when filters match nothing', async () => {
		const find = jest.fn().mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([p1, p2]));
		const service = new PropertyService({ find } as any, {} as any, {} as any);
		const list = await service.getPropertiesForAi({ text: 'house in Jeju' });
		expect(find).toHaveBeenCalledTimes(2);
		expect(find.mock.calls[1][0]).toEqual({ propertyStatus: 'ACTIVE' });
		expect(list).toHaveLength(2);
	});
});
