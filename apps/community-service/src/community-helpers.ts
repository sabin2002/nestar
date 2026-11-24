import { ClientProxy } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { MEMBER, rpcCall, SOCIAL } from '@app/common';
import { Member } from '@app/common/dto/member/member';

/** Replaces the old lookupMember $lookup: one member-service call for a whole page of results. */
export async function attachMembers<TItem extends { memberId?: any; memberData?: Member }>(
	memberClient: ClientProxy,
	list: TItem[],
): Promise<void> {
	if (!list.length) return;
	const members = await rpcCall<Member[]>(memberClient, MEMBER.BY_IDS, list.map((ele) => String(ele.memberId)));
	const byId = new Map(members.map((member) => [String(member._id), member]));
	list.forEach((ele) => (ele.memberData = byId.get(String(ele.memberId))));
}

/** Replaces the old lookupAuthMemberLiked $lookup: one social-service call for a whole page of results. */
export async function attachMeLiked<TItem extends { _id: any; meLiked?: any[] }>(
	socialClient: ClientProxy,
	list: TItem[],
	memberId: Types.ObjectId | null,
): Promise<void> {
	if (!memberId || !list.length) {
		list.forEach((ele) => (ele.meLiked = []));
		return;
	}
	const liked = await rpcCall<string[]>(socialClient, SOCIAL.LIKE_CHECK_MANY, {
		memberId,
		refIds: list.map((ele) => ele._id),
	});
	const likedSet = new Set(liked);
	list.forEach((ele) => {
		ele.meLiked = likedSet.has(String(ele._id)) ? [{ memberId, likeRefId: ele._id, myFavorite: true }] : [];
	});
}
