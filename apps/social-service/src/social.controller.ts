import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SOCIAL, toObjectId } from '@app/common';
import { LikeInput } from '@app/common/dto/like/like.input';
import { ViewInput } from '@app/common/dto/view/view.input';
import { OrdinaryInquiry } from '@app/common/dto/property/property.input';
import { FollowInquiry } from '@app/common/dto/follow/follow.input';
import { LikeService } from './like.service';
import { ViewService } from './view.service';
import { FollowService } from './follow.service';

@Controller()
export class SocialController {
	constructor(
		private readonly likeService: LikeService,
		private readonly viewService: ViewService,
		private readonly followService: FollowService,
	) {}

	/** VIEW **/
	@MessagePattern(SOCIAL.VIEW_RECORD)
	recordView(@Payload() input: ViewInput) {
		return this.viewService.recordView(input);
	}

	@MessagePattern(SOCIAL.VIEW_VISITED)
	getVisited(@Payload() { memberId, input }: { memberId: string; input: OrdinaryInquiry }) {
		return this.viewService.getVisitedProperties(toObjectId(memberId)!, input);
	}

	/** LIKE **/
	@MessagePattern(SOCIAL.LIKE_TOGGLE)
	toggleLike(@Payload() input: LikeInput) {
		return this.likeService.toggleLike(input);
	}

	@MessagePattern(SOCIAL.LIKE_CHECK)
	checkLike(@Payload() input: LikeInput) {
		return this.likeService.checkLikeExistance(input);
	}

	@MessagePattern(SOCIAL.LIKE_CHECK_MANY)
	checkLikes(@Payload() input: { memberId: string; refIds: string[] }) {
		return this.likeService.checkManyLikes(input);
	}

	@MessagePattern(SOCIAL.LIKE_FAVORITES)
	getFavorites(@Payload() { memberId, input }: { memberId: string; input: OrdinaryInquiry }) {
		return this.likeService.getFavoriteProperties(toObjectId(memberId)!, input);
	}

	/** FOLLOW **/
	@MessagePattern(SOCIAL.FOLLOW_SUBSCRIBE)
	subscribe(@Payload() { followerId, followingId }: { followerId: string; followingId: string }) {
		return this.followService.subscribe(toObjectId(followerId)!, toObjectId(followingId)!);
	}

	@MessagePattern(SOCIAL.FOLLOW_UNSUBSCRIBE)
	unsubscribe(@Payload() { followerId, followingId }: { followerId: string; followingId: string }) {
		return this.followService.unsubscribe(toObjectId(followerId)!, toObjectId(followingId)!);
	}

	@MessagePattern(SOCIAL.FOLLOW_FOLLOWINGS)
	getFollowings(@Payload() { memberId, input }: { memberId: string | null; input: FollowInquiry }) {
		return this.followService.getMemberFollowings(toObjectId(memberId), input);
	}

	@MessagePattern(SOCIAL.FOLLOW_FOLLOWERS)
	getFollowers(@Payload() { memberId, input }: { memberId: string | null; input: FollowInquiry }) {
		return this.followService.getMemberFollowers(toObjectId(memberId), input);
	}

	@MessagePattern(SOCIAL.FOLLOW_CHECK)
	checkSubscription(@Payload() { followerId, followingId }: { followerId: string; followingId: string }) {
		return this.followService.checkSubscription(toObjectId(followerId)!, toObjectId(followingId)!);
	}
}
