import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { rpcCall, SOCIAL, SOCIAL_SERVICE } from '@app/common';
import { Follower, Followers, Followings } from '@app/common/dto/follow/follow';
import { FollowInquiry } from '@app/common/dto/follow/follow.input';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';

@Resolver()
export class FollowResolver {
	constructor(@Inject(SOCIAL_SERVICE) private readonly socialClient: ClientProxy) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Follower)
	public async subscribe(
		@Args('input') followingId: string,
		@AuthMember('_id') followerId: mongoose.Types.ObjectId,
	): Promise<Follower> {
		console.log('Mutation: subscribe');
		return await rpcCall(this.socialClient, SOCIAL.FOLLOW_SUBSCRIBE, { followerId, followingId });
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Follower)
	public async unsubscribe(
		@Args('input') followingId: string,
		@AuthMember('_id') followerId: mongoose.Types.ObjectId,
	): Promise<Follower> {
		console.log('Mutation: unsubscribe');
		return await rpcCall(this.socialClient, SOCIAL.FOLLOW_UNSUBSCRIBE, { followerId, followingId });
	}

	@UseGuards(WithoutGuard)
	@Query(() => Followings)
	public async getMemberFollowings(
		@Args('input') input: FollowInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Followings> {
		console.log('Query: getMemberFollowings');
		return await rpcCall(this.socialClient, SOCIAL.FOLLOW_FOLLOWINGS, { memberId, input });
	}

	@UseGuards(WithoutGuard)
	@Query(() => Followers)
	public async getMemberFollowers(
		@Args('input') input: FollowInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Followers> {
		console.log('Query: getMemberFollowers');
		return await rpcCall(this.socialClient, SOCIAL.FOLLOW_FOLLOWERS, { memberId, input });
	}
}
