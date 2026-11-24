import { BadRequestException, Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MEMBER, MEMBER_SERVICE, plain, PROPERTY, PROPERTY_SERVICE, rpcCall, toObjectId } from '@app/common';
import { Comment, Comments } from '@app/common/dto/comment/comment';
import { CommentInput, CommentsInquiry } from '@app/common/dto/comment/comment.input';
import { CommentUpdate } from '@app/common/dto/comment/comment.update';
import { CommentGroup, CommentStatus } from '@app/common/enums/comment.enum';
import { Direction, Message } from '@app/common/enums/common.enum';
import { T } from '@app/common/types/common';
import { BoardArticleService } from './board-article.service';
import { attachMembers } from './community-helpers';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		@Inject(MEMBER_SERVICE) private readonly memberClient: ClientProxy,
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
		private readonly boardArticleService: BoardArticleService,
	) {}

	public async createComment(memberId: Types.ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;

		let result: Comment;
		try {
			result = plain(await this.commentModel.create(input));
		} catch (err: any) {
			console.log('Error, Service.model: ', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		const _id = toObjectId(input.commentRefId);
		switch (input.commentGroup) {
			case CommentGroup.PROPERTY:
				// the property lives in property-service
				await rpcCall(this.propertyClient, PROPERTY.STATS, { _id, targetKey: 'propertyComments', modifier: 1 });
				break;
			case CommentGroup.ARTICLE:
				// board articles live in this same service
				await this.boardArticleService.boardArticleStatsEditor({ _id: _id!, targetKey: 'articleComments', modifier: 1 });
				break;
			case CommentGroup.MEMBER:
				await rpcCall(this.memberClient, MEMBER.STATS, { _id, targetKey: 'memberComments', modifier: 1 });
				break;
		}

		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		return result;
	}

	public async updateComment(memberId: Types.ObjectId, input: CommentUpdate): Promise<Comment> {
		const result = await this.commentModel
			.findOneAndUpdate({ _id: toObjectId(input._id), memberId, commentStatus: CommentStatus.ACTIVE }, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return plain(result);
	}

	public async getComments(input: CommentsInquiry): Promise<Comments> {
		const match: T = { commentRefId: toObjectId(input.search.commentRefId), commentStatus: CommentStatus.ACTIVE };
		const sort: T = { [input?.sort || 'createdAt']: input?.direction ?? Direction.DESC };

		const result: Comments[] = await this.commentModel
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

		const comments = result[0];
		await attachMembers(this.memberClient, comments.list);
		return comments;
	}

	public async removeCommentByAdmin(commentId: Types.ObjectId): Promise<Comment> {
		const result = await this.commentModel.findByIdAndDelete(commentId).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return plain(result);
	}
}
