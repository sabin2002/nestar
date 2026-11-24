import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MEMBER, MEMBER_SERVICE, plain, rpcCall, toObjectId } from '@app/common';
import { Follower, Followers, Following, Followings, MeFollowed } from '@app/common/dto/follow/follow';
import { FollowInquiry } from '@app/common/dto/follow/follow.input';
import { Member } from '@app/common/dto/member/member';
import { Direction, Message } from '@app/common/enums/common.enum';
import { T } from '@app/common/types/common';
import { lookupAuthMemberFollowed, lookupAuthMemberLiked } from '@app/common/config';

@Injectable()
export class FollowService {
	constructor(
		@InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
		@Inject(MEMBER_SERVICE) private readonly memberClient: ClientProxy,
	) {}

	public async subscribe(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<Follower> {
		if (followerId.toString() === followingId.toString()) {
			throw new InternalServerErrorException(Message.SELF_SUBSCRIPTION_DENIED);
		}
		// throws NO_DATA_FOUND if the target member does not exist
		await rpcCall<Member>(this.memberClient, MEMBER.GET, { memberId: null, targetId: followingId });

		let result: Follower;
		try {
			result = plain(await this.followModel.create({ followingId, followerId }));
		} catch (err: any) {
			console.log('Error, ServiceModel', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		await this.memberStats(followerId, 'memberFollowings', 1);
		await this.memberStats(followingId, 'memberFollowers', 1);
		return result;
	}

	public async unsubscribe(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<Follower> {
		await rpcCall<Member>(this.memberClient, MEMBER.GET, { memberId: null, targetId: followingId });

		const result = await this.followModel.findOneAndDelete({ followingId, followerId }).exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		await this.memberStats(followerId, 'memberFollowings', -1);
		await this.memberStats(followingId, 'memberFollowers', -1);
		return plain(result);
	}

	public async checkSubscription(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<MeFollowed[]> {
		const result = await this.followModel.findOne({ followingId, followerId }).exec();
		return result ? [{ followerId, followingId, myFollowing: true }] : [];
	}

	public async getMemberFollowings(memberId: Types.ObjectId | null, input: FollowInquiry): Promise<Followings> {
		const { page, limit, search } = input;
		if (!search?.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);
		const match: T = { followerId: toObjectId(search.followerId) };

		// likes and follows both live in this service's database, so these two $lookups still work.
		const result = await this.followModel
			.aggregate([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followingId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followingId' }),
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const followings: Followings = result[0];
		const members = await this.membersById(followings.list.map((ele) => ele.followingId));
		followings.list = followings.list
			.map((ele) => ({ ...ele, followingData: members.get(String(ele.followingId)) }))
			.filter((ele) => ele.followingData);
		return followings;
	}

	public async getMemberFollowers(memberId: Types.ObjectId | null, input: FollowInquiry): Promise<Followers> {
		const { page, limit, search } = input;
		if (!search?.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);
		const match: T = { followingId: toObjectId(search.followingId) };

		const result = await this.followModel
			.aggregate([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupAuthMemberLiked(memberId, '$followerId'),
							lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followerId' }),
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const followers: Followers = result[0];
		const members = await this.membersById(followers.list.map((ele) => ele.followerId));
		followers.list = followers.list
			.map((ele) => ({ ...ele, followerData: members.get(String(ele.followerId)) }))
			.filter((ele) => ele.followerData);
		return followers;
	}

	private async membersById(ids: any[]): Promise<Map<string, Member>> {
		const members = await rpcCall<Member[]>(this.memberClient, MEMBER.BY_IDS, ids.map(String));
		return new Map(members.map((member) => [String(member._id), member]));
	}

	private async memberStats(memberId: Types.ObjectId, targetKey: string, modifier: number): Promise<void> {
		await rpcCall(this.memberClient, MEMBER.STATS, { _id: memberId, targetKey, modifier });
	}
}
