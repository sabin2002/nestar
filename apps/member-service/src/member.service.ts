import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plain, rpcCall, SOCIAL, SOCIAL_SERVICE, toObjectId } from '@app/common';
import { Member, Members } from '@app/common/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '@app/common/dto/member/member.input';
import { MemberUpdate } from '@app/common/dto/member/member.update';
import { MemberStatus, MemberType } from '@app/common/enums/member.enum';
import { Direction, Message } from '@app/common/enums/common.enum';
import { StatisticModifier, T } from '@app/common/types/common';
import { ViewGroup } from '@app/common/enums/view.enum';
import { ViewInput } from '@app/common/dto/view/view.input';
import { LikeInput } from '@app/common/dto/like/like.input';
import { LikeGroup } from '@app/common/enums/like.enum';
import { MeFollowed } from '@app/common/dto/follow/follow';
import { MeLiked } from '@app/common/dto/like/like';
import { TokenService } from './token.service';

@Injectable()
export class MemberService {
	constructor(
		@InjectModel('Member') private readonly memberModel: Model<Member>,
		@Inject(SOCIAL_SERVICE) private readonly socialClient: ClientProxy,
		private readonly tokenService: TokenService,
	) {}

	public async signup(input: MemberInput): Promise<Member> {
		input.memberPassword = await this.tokenService.hashPassword(input.memberPassword);
		try {
			const result = plain<Member>(await this.memberModel.create(input));
			delete (result as any).memberPassword;
			result.accessToken = await this.tokenService.createToken(result);
			return result;
		} catch (err: any) {
			console.log('Error, Service.model: ', err.message);
			throw new BadRequestException(Message.USED_MEMBER_NICK_OR_PHONE);
		}
	}

	public async login(input: LoginInput): Promise<Member> {
		const { memberNick } = input;
		const response = await this.memberModel.findOne({ memberNick: memberNick }).select('+memberPassword').exec();

		if (!response || response.memberStatus === MemberStatus.DELETE) {
			throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
		} else if (response.memberStatus === MemberStatus.BLOCK) {
			throw new InternalServerErrorException(Message.BLOCKED_USER);
		}

		const isMatch = await this.tokenService.comparePasswords(input.memberPassword, response.memberPassword);
		if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

		const result = plain<Member>(response);
		delete (result as any).memberPassword;
		result.accessToken = await this.tokenService.createToken(result);
		return result;
	}

	public async updateMember(memberId: Types.ObjectId, input: MemberUpdate): Promise<Member> {
		delete (input as any)._id;
		const result = await this.memberModel
			.findOneAndUpdate({ _id: memberId, memberStatus: MemberStatus.ACTIVE }, input, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		const member = plain<Member>(result);
		member.accessToken = await this.tokenService.createToken(member);
		return member;
	}

	public async getMember(memberId: Types.ObjectId | null, targetId: Types.ObjectId): Promise<Member> {
		const search: T = {
			_id: targetId,
			memberStatus: { $in: [MemberStatus.ACTIVE, MemberStatus.BLOCK] },
		};
		const targetMember = await this.memberModel.findOne(search).lean<Member>().exec();
		if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			// record view (social-service)
			const viewInput: ViewInput = { memberId, viewRefId: targetId, viewGroup: ViewGroup.MEMBER };
			const newView = await rpcCall(this.socialClient, SOCIAL.VIEW_RECORD, viewInput);
			if (newView) {
				await this.memberModel.findOneAndUpdate(search, { $inc: { memberViews: 1 } }).exec();
				targetMember.memberViews++;
			}

			// meLiked + meFollowed (social-service)
			const likeInput: LikeInput = { memberId, likeRefId: targetId, likeGroup: LikeGroup.MEMBER };
			const [meLiked, meFollowed] = await Promise.all([
				rpcCall<MeLiked[]>(this.socialClient, SOCIAL.LIKE_CHECK, likeInput),
				rpcCall<MeFollowed[]>(this.socialClient, SOCIAL.FOLLOW_CHECK, { followerId: memberId, followingId: targetId }),
			]);
			targetMember.meLiked = meLiked;
			targetMember.meFollowed = meFollowed;
		}

		return targetMember;
	}

	public async getAgents(memberId: Types.ObjectId | null, input: AgentsInquiry): Promise<Members> {
		const { text } = input.search;
		const match: T = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };
		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const members: Members = result[0];
		await this.attachMeLiked(members.list, memberId);
		return members;
	}

	/** Replaces the old lookupAuthMemberLiked $lookup: asks social-service which of these members the user liked. */
	private async attachMeLiked(list: Member[], memberId: Types.ObjectId | null): Promise<void> {
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
			const id = String(ele._id);
			ele.meLiked = likedSet.has(id) ? [{ memberId, likeRefId: ele._id, myFavorite: true }] : [];
		});
	}

	/** LIKE **/

	public async likeTargetMember(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<Member> {
		const target = await this.memberModel.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.MEMBER };
		const modifier: number = (await rpcCall<number>(this.socialClient, SOCIAL.LIKE_TOGGLE, input)) ?? 1;
		return await this.memberStatsEditor({ _id: likeRefId, targetKey: 'memberLikes', modifier });
	}

	/** ADMIN **/

	public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
		const { memberStatus, memberType, text } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (memberStatus) match.memberStatus = memberStatus;
		if (memberType) match.memberType = memberType;
		if (text) match.memberNick = { $regex: new RegExp(text, 'i') };

		const result = await this.memberModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
		const result = await this.memberModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return plain(result);
	}

	/** Called by other services (property, community, social) to bump counters like memberProperties. */
	public async memberStatsEditor(input: StatisticModifier): Promise<Member> {
		const { _id, targetKey, modifier } = input;
		const result = await this.memberModel
			.findOneAndUpdate({ _id: toObjectId(_id) }, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return plain(result);
	}

	/** Replaces the old lookupMember $lookup used by other services: returns members for a list of ids. */
	public async getMembersByIds(ids: string[]): Promise<Member[]> {
		const objectIds = [...new Set((ids ?? []).filter(Boolean).map(String))].map((id) => toObjectId(id));
		if (!objectIds.length) return [];
		return await this.memberModel.find({ _id: { $in: objectIds } }).lean<Member[]>().exec();
	}

	/** BATCH (called by nestar-batch scheduler) **/

	public async batchRollback(): Promise<boolean> {
		await this.memberModel
			.updateMany({ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.AGENT }, { memberRank: 0 })
			.exec();
		return true;
	}

	public async batchTopAgents(): Promise<number> {
		const agents = await this.memberModel
			.find({ memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE, memberRank: 0 })
			.exec();
		await Promise.all(
			agents.map((ele) => {
				const { _id, memberProperties, memberLikes, memberArticles, memberViews } = ele;
				const rank = memberProperties * 5 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
				return this.memberModel.findByIdAndUpdate(_id, { memberRank: rank }).exec();
			}),
		);
		return agents.length;
	}
}
