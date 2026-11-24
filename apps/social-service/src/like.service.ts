import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plain, PROPERTY, PROPERTY_SERVICE, rpcCall, toObjectId } from '@app/common';
import { Like, MeLiked } from '@app/common/dto/like/like';
import { LikeInput } from '@app/common/dto/like/like.input';
import { OrdinaryInquiry } from '@app/common/dto/property/property.input';
import { Properties, Property } from '@app/common/dto/property/property';
import { LikeGroup } from '@app/common/enums/like.enum';
import { Message } from '@app/common/enums/common.enum';
import { T } from '@app/common/types/common';

@Injectable()
export class LikeService {
	constructor(
		@InjectModel('Like') private readonly likeModel: Model<Like>,
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
	) {}

	public async toggleLike(input: LikeInput): Promise<number> {
		const search: T = { memberId: toObjectId(input.memberId), likeRefId: toObjectId(input.likeRefId) };
		const exist = await this.likeModel.findOne(search).exec();

		let modifier = 1;
		if (exist) {
			await this.likeModel.findOneAndDelete(search).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create(input);
			} catch (err: any) {
				console.log('Error, Service.model: ', err.message);
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}
		return modifier;
	}

	public async checkLikeExistance(input: LikeInput): Promise<MeLiked[]> {
		const { memberId, likeRefId } = input;
		const result = await this.likeModel
			.findOne({ memberId: toObjectId(memberId), likeRefId: toObjectId(likeRefId) })
			.exec();
		return result ? [{ memberId, likeRefId, myFavorite: true }] : [];
	}

	/** Batch version of checkLikeExistance: returns the subset of refIds this member has liked. */
	public async checkManyLikes(input: { memberId: string; refIds: string[] }): Promise<string[]> {
		const refIds = (input?.refIds ?? []).filter(Boolean).map((id) => toObjectId(id));
		if (!input?.memberId || !refIds.length) return [];
		const likes = await this.likeModel
			.find({ memberId: toObjectId(input.memberId), likeRefId: { $in: refIds } })
			.select('likeRefId')
			.lean()
			.exec();
		return likes.map((like: any) => String(like.likeRefId));
	}

	public async getFavoriteProperties(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		const { page, limit } = input;
		const match: T = { likeGroup: LikeGroup.PROPERTY, memberId };

		const [likes, total] = await Promise.all([
			this.likeModel
				.find(match)
				.sort({ updatedAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.likeModel.countDocuments(match).exec(),
		]);

		const list = await rpcCall<Property[]>(
			this.propertyClient,
			PROPERTY.BY_IDS,
			likes.map((like: any) => String(like.likeRefId)),
		);
		return { list: list.map((ele) => plain(ele)), metaCounter: total ? [{ total }] : [] };
	}
}
