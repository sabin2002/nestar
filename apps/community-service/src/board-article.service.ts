import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MEMBER, MEMBER_SERVICE, plain, rpcCall, SOCIAL, SOCIAL_SERVICE, toObjectId } from '@app/common';
import {
	AllBoardArticlesInquiry,
	BoardArticleInput,
	BoardArticlesInquiry,
} from '@app/common/dto/board-article/board-article.input';
import { BoardArticle, BoardArticles } from '@app/common/dto/board-article/board-article';
import { BoardArticleUpdate } from '@app/common/dto/board-article/board-article.update';
import { Member } from '@app/common/dto/member/member';
import { MeLiked } from '@app/common/dto/like/like';
import { LikeInput } from '@app/common/dto/like/like.input';
import { StatisticModifier, T } from '@app/common/types/common';
import { BoardArticleStatus } from '@app/common/enums/board-article.enum';
import { Direction, Message } from '@app/common/enums/common.enum';
import { ViewGroup } from '@app/common/enums/view.enum';
import { LikeGroup } from '@app/common/enums/like.enum';
import { attachMeLiked, attachMembers } from './community-helpers';

@Injectable()
export class BoardArticleService {
	constructor(
		@InjectModel('BoardArticle') private readonly boardArticleModel: Model<BoardArticle>,
		@Inject(MEMBER_SERVICE) private readonly memberClient: ClientProxy,
		@Inject(SOCIAL_SERVICE) private readonly socialClient: ClientProxy,
	) {}

	public async createBoardArticle(memberId: Types.ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
		input.memberId = memberId;
		let result: BoardArticle;
		try {
			result = plain(await this.boardArticleModel.create(input));
		} catch (err: any) {
			console.log('Error, Service.model:', err?.message ?? err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
		await this.memberStats(memberId, 'memberBoardArticles', 1);
		return result;
	}

	public async getBoardArticle(memberId: Types.ObjectId | null, articleId: Types.ObjectId): Promise<BoardArticle> {
		const search: T = { _id: articleId, articleStatus: BoardArticleStatus.ACTIVE };
		const targetBoardArticle = await this.boardArticleModel.findOne(search).lean<BoardArticle>().exec();
		if (!targetBoardArticle) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId, viewRefId: articleId, viewGroup: ViewGroup.ARTICLE };
			const newView = await rpcCall(this.socialClient, SOCIAL.VIEW_RECORD, viewInput);
			if (newView) {
				await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
				targetBoardArticle.articleViews++;
			}

			const likeInput: LikeInput = { memberId, likeRefId: articleId, likeGroup: LikeGroup.ARTICLE };
			targetBoardArticle.meLiked = await rpcCall<MeLiked[]>(this.socialClient, SOCIAL.LIKE_CHECK, likeInput);
		}

		targetBoardArticle.memberData = await rpcCall<Member>(this.memberClient, MEMBER.GET, {
			memberId: null,
			targetId: targetBoardArticle.memberId,
		});
		return targetBoardArticle;
	}

	public async updateBoardArticle(memberId: Types.ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
		const { _id, articleStatus } = input;
		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: toObjectId(_id), memberId, articleStatus: BoardArticleStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === BoardArticleStatus.DELETE) await this.memberStats(memberId, 'memberBoardArticles', -1);
		return plain(result);
	}

	public async getBoardArticles(memberId: Types.ObjectId | null, input: BoardArticlesInquiry): Promise<BoardArticles> {
		const { articleCategory, text } = input.search;
		const match: T = { articleStatus: BoardArticleStatus.ACTIVE };
		const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

		if (articleCategory) match.articleCategory = articleCategory;
		if (text) match.articleTitle = { $regex: new RegExp(text, 'i') };
		if (input.search.memberId) match.memberId = toObjectId(input.search.memberId);

		const result = await this.paginate(match, sort, input.page, input.limit);
		await Promise.all([
			attachMeLiked(this.socialClient, result.list, memberId),
			attachMembers(this.memberClient, result.list),
		]);
		return result;
	}

	/** LIKE **/

	public async likeTargetBoardArticle(memberId: Types.ObjectId, likeRefId: Types.ObjectId): Promise<BoardArticle> {
		const target = await this.boardArticleModel
			.findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.ARTICLE };
		const modifier: number = (await rpcCall<number>(this.socialClient, SOCIAL.LIKE_TOGGLE, input)) ?? 1;
		const result = await this.boardArticleStatsEditor({ _id: likeRefId, targetKey: 'articleLikes', modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	/** ADMIN **/

	public async getAllBoardArticlesByAdmin(input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		const { articleStatus, articleCategory } = input.search;
		const match: T = {};
		const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

		if (articleStatus) match.articleStatus = articleStatus;
		if (articleCategory) match.articleCategory = articleCategory;

		const result = await this.paginate(match, sort, input.page, input.limit);
		await attachMembers(this.memberClient, result.list);
		return result;
	}

	public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
		const { _id, articleStatus } = input;
		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: toObjectId(_id), articleStatus: BoardArticleStatus.ACTIVE }, input, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (articleStatus === BoardArticleStatus.DELETE) {
			await this.memberStats(result.memberId, 'memberBoardArticles', -1);
		}
		return plain(result);
	}

	public async removeBoardArticleByAdmin(articleId: Types.ObjectId): Promise<BoardArticle> {
		const result = await this.boardArticleModel
			.findOneAndDelete({ _id: articleId, articleStatus: BoardArticleStatus.DELETE })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return plain(result);
	}

	public async boardArticleStatsEditor(input: StatisticModifier): Promise<BoardArticle | null> {
		const { _id, targetKey, modifier } = input;
		const result = await this.boardArticleModel
			.findOneAndUpdate({ _id: toObjectId(_id) }, { $inc: { [targetKey]: modifier } }, { new: true })
			.exec();
		return plain(result);
	}

	private async paginate(match: T, sort: T, page: number, limit: number): Promise<BoardArticles> {
		const result = await this.boardArticleModel
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
}
