import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import moment from 'moment';
import { MEMBER, MEMBER_SERVICE, plain, rpcCall, SOCIAL, SOCIAL_SERVICE, toObjectId } from '@app/common';
import {
	AgentsPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '@app/common/dto/property/property.input';
import { Properties, Property } from '@app/common/dto/property/property';
import { PropertyUpdate } from '@app/common/dto/property/property.update';
import { Member } from '@app/common/dto/member/member';
import { MeLiked } from '@app/common/dto/like/like';
import { StatisticModifier, T } from '@app/common/types/common';
import { Direction, Message } from '@app/common/enums/common.enum';
import { PropertyLocation, PropertyStatus, PropertyType } from '@app/common/enums/property.enum';
import { ViewGroup } from '@app/common/enums/view.enum';
import { ViewInput } from '@app/common/dto/view/view.input';
import { LikeInput } from '@app/common/dto/like/like.input';
import { LikeGroup } from '@app/common/enums/like.enum';
import { shapeIntoMongoObjectId } from '@app/common/config';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		@Inject(MEMBER_SERVICE) private readonly memberClient: ClientProxy,
		@Inject(SOCIAL_SERVICE) private readonly socialClient: ClientProxy,
	) {}

	public async createProperty(input: PropertyInput): Promise<Property> {
		let result: Property;
		try {
			result = plain(await this.propertyModel.create(input));
		} catch (err: any) {
			console.log('Error, Service.model: ', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
		// increase memberProperties +1 (member-service)
		try {
			await this.memberStats(result.memberId, 'memberProperties', 1);
		} catch (err: any) {
			console.error('Property created, but member property counter was not updated:', err.message);
		}
		return result;
	}

	public async getProperty(memberId: Types.ObjectId | null, propertyId: Types.ObjectId): Promise<Property> {
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.ACTIVE };
		const targetProperty = await this.propertyModel.findOne(search).lean<Property>().exec();
		if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput: ViewInput = { memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
			const newView = await rpcCall(this.socialClient, SOCIAL.VIEW_RECORD, viewInput);
			if (newView) {
				await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
				targetProperty.propertyViews++;
			}

			const likeInput: LikeInput = { memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY };
			targetProperty.meLiked = await rpcCall<MeLiked[]>(this.socialClient, SOCIAL.LIKE_CHECK, likeInput);
		}

		targetProperty.memberData = await rpcCall<Member>(this.memberClient, MEMBER.GET, {
			memberId: null,
			targetId: targetProperty.memberId,
		});
		return targetProperty;
	}

	public async propertyStatsEditor(input: StatisticModifier): Promise<Property | null> {
		const { _id, targetKey, modifier } = input;
		const result = await this.propertyModel
			.findOneAndUpdate({ _id: toObjectId(_id) }, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		return plain(result);
	}

	public async updateProperty(memberId: Types.ObjectId, input: PropertyUpdate): Promise<Property> {
		const { propertyStatus } = input;
		const search: T = { _id: toObjectId(input._id), memberId, propertyStatus: PropertyStatus.ACTIVE };

		if (propertyStatus === PropertyStatus.SOLD) input.soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) input.deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (input.soldAt || input.deletedAt) await this.memberStats(memberId, 'memberProperties', -1);
		return plain(result);
	}

	public async getProperties(memberId: Types.ObjectId | null, input: PropertiesInquiry): Promise<Properties> {
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		this.shapeMatchQuery(match, input);

		const result = await this.paginate(match, sort, input.page, input.limit);
		await Promise.all([this.attachMembers(result.list), this.attachMeLiked(result.list, memberId)]);
		return result;
	}

	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		const { memberId, locationList, roomsList, bedsList, typeList, periodsRange, pricesRange, squaresRange, options, text } =
			input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
		if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
		if (bedsList && bedsList.length) match.propertyBeds = { $in: bedsList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange)
			match.createdAt = { $gte: new Date(periodsRange.start), $lte: new Date(periodsRange.end) };
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		if (options) match['$or'] = options.map((ele) => ({ [ele]: true }));
	}

	public async getAgentsProperties(memberId: Types.ObjectId, input: AgentsPropertiesInquiry): Promise<Properties> {
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = { memberId, propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE } };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.paginate(match, sort, input.page, input.limit);
		await this.attachMembers(result.list);
		return result;
	}

	/** LIKE **/

	public async likeTargetProperty(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<Property> {
		const target = await this.propertyModel.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.PROPERTY };
		const modifier: number = (await rpcCall<number>(this.socialClient, SOCIAL.LIKE_TOGGLE, input)) ?? 1;
		const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: 'propertyLikes', modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	/** ADMIN **/

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result = await this.paginate(match, sort, input.page, input.limit);
		await this.attachMembers(result.list);
		return result;
	}

	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		const { propertyStatus } = input;
		const search: T = { _id: toObjectId(input._id), propertyStatus: PropertyStatus.ACTIVE };

		if (propertyStatus === PropertyStatus.SOLD) input.soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) input.deletedAt = moment().toDate();

		const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (input.soldAt || input.deletedAt) await this.memberStats(result.memberId, 'memberProperties', -1);
		return plain(result);
	}

	public async removePropertyByAdmin(propertyId: Types.ObjectId): Promise<Property> {
		const result = await this.propertyModel
			.findOneAndDelete({ _id: propertyId, propertyStatus: PropertyStatus.DELETE })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return plain(result);
	}

	/** Used by social-service (favorites / recently visited). Keeps the order of the ids it was given. */
	public async getPropertiesByIds(ids: string[]): Promise<Property[]> {
		const objectIds = (ids ?? []).filter(Boolean).map((id) => toObjectId(id));
		if (!objectIds.length) return [];
		const list = await this.propertyModel.find({ _id: { $in: objectIds } }).lean<Property[]>().exec();
		await this.attachMembers(list);
		const byId = new Map(list.map((ele) => [String(ele._id), ele]));
		return ids.map((id) => byId.get(String(id))).filter((ele): ele is Property => !!ele);
	}

	/**
	 * Used by ai-service: picks listings relevant to a chat message.
	 * Detects city / property type / bed count / "under <price>" in the text; falls back to top-ranked listings.
	 */
	public async getPropertiesForAi(input: { text?: string; limit?: number }): Promise<Property[]> {
		const text = (input?.text ?? '').toUpperCase();
		const limit = Math.min(Math.max(Number(input?.limit) || 8, 1), 20);
		const match: T = { propertyStatus: PropertyStatus.ACTIVE };

		const locations = Object.values(PropertyLocation).filter((loc) => text.includes(loc));
		if (locations.length) match.propertyLocation = { $in: locations };

		const types = Object.values(PropertyType).filter((type) => text.includes(type) || text.includes(`${type}S`));
		if (types.length) match.propertyType = { $in: types };

		const beds = text.match(/(\d+)\s*-?\s*(BED|BEDROOM|ROOM)/);
		if (beds) match.propertyBeds = { $gte: Number(beds[1]) };

		const maxPrice = text.match(/(UNDER|BELOW|LESS THAN|MAX|UP TO)\s*\$?\s*([\d,.]+)\s*(K|M)?/);
		if (maxPrice) {
			const multiplier = maxPrice[3] === 'K' ? 1_000 : maxPrice[3] === 'M' ? 1_000_000 : 1;
			match.propertyPrice = { $lte: Number(maxPrice[2].replace(/,/g, '')) * multiplier };
		}
		if (text.includes('RENT')) match.propertyRent = true;
		if (text.includes('BARTER')) match.propertyBarter = true;

		let list = await this.propertyModel
			.find(match)
			.sort({ propertyRank: -1, propertyLikes: -1, createdAt: -1 })
			.limit(limit)
			.lean<Property[]>()
			.exec();

		// Nothing matched the filters: give the assistant the best listings overall instead.
		if (!list.length && Object.keys(match).length > 1) {
			list = await this.propertyModel
				.find({ propertyStatus: PropertyStatus.ACTIVE })
				.sort({ propertyRank: -1, propertyLikes: -1, createdAt: -1 })
				.limit(limit)
				.lean<Property[]>()
				.exec();
		}
		return list;
	}

	/** BATCH (called by nestar-batch scheduler) **/

	public async batchRollback(): Promise<boolean> {
		await this.propertyModel.updateMany({ propertyStatus: PropertyStatus.ACTIVE }, { propertyRank: 0 }).exec();
		return true;
	}

	public async batchTopProperties(): Promise<number> {
		const properties = await this.propertyModel.find({ propertyStatus: PropertyStatus.ACTIVE }).exec();
		await Promise.all(
			properties.map((ele) => {
				const rank = ele.propertyLikes * 2 + ele.propertyViews * 1;
				return this.propertyModel.findByIdAndUpdate(ele._id, { propertyRank: rank }).exec();
			}),
		);
		return properties.length;
	}

	/** HELPERS **/

	private async paginate(match: T, sort: T, page: number, limit: number): Promise<Properties> {
		const result = await this.propertyModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (page - 1) * limit }, { $limit: limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	private async memberStats(memberId: any, targetKey: string, modifier: number): Promise<void> {
		await rpcCall(this.memberClient, MEMBER.STATS, { _id: memberId, targetKey, modifier });
	}

	/** Replaces the old lookupMember $lookup: fetch the owners from member-service in one call. */
	private async attachMembers(list: Property[]): Promise<void> {
		if (!list.length) return;
		const members = await rpcCall<Member[]>(this.memberClient, MEMBER.BY_IDS, list.map((ele) => ele.memberId));
		const byId = new Map(members.map((member) => [String(member._id), member]));
		list.forEach((ele) => (ele.memberData = byId.get(String(ele.memberId))));
	}

	/** Replaces the old lookupAuthMemberLiked $lookup: ask social-service which listings this user liked. */
	private async attachMeLiked(list: Property[], memberId: Types.ObjectId | null): Promise<void> {
		if (!memberId || !list.length) {
			list.forEach((ele) => (ele.meLiked = []));
			return;
		}
		const liked = await rpcCall<string[]>(this.socialClient, SOCIAL.LIKE_CHECK_MANY, {
			memberId,
			refIds: list.map((ele) => ele._id),
		});
		const likedSet = new Set(liked);
		list.forEach((ele) => {
			ele.meLiked = likedSet.has(String(ele._id)) ? [{ memberId, likeRefId: ele._id, myFavorite: true }] : [];
		});
	}
}
