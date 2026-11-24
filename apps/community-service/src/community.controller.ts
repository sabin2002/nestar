import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ARTICLE, COMMENT, toObjectId } from '@app/common';
import {
	AllBoardArticlesInquiry,
	BoardArticleInput,
	BoardArticlesInquiry,
} from '@app/common/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '@app/common/dto/board-article/board-article.update';
import { CommentInput, CommentsInquiry } from '@app/common/dto/comment/comment.input';
import { CommentUpdate } from '@app/common/dto/comment/comment.update';
import type { StatisticModifier } from '@app/common/types/common';
import { BoardArticleService } from './board-article.service';
import { CommentService } from './comment.service';

@Controller()
export class CommunityController {
	constructor(
		private readonly boardArticleService: BoardArticleService,
		private readonly commentService: CommentService,
	) {}

	/** BOARD ARTICLE **/
	@MessagePattern(ARTICLE.CREATE)
	createBoardArticle(@Payload() { memberId, input }: { memberId: string; input: BoardArticleInput }) {
		return this.boardArticleService.createBoardArticle(toObjectId(memberId)!, input);
	}

	@MessagePattern(ARTICLE.GET)
	getBoardArticle(@Payload() { memberId, articleId }: { memberId: string | null; articleId: string }) {
		return this.boardArticleService.getBoardArticle(toObjectId(memberId), toObjectId(articleId)!);
	}

	@MessagePattern(ARTICLE.UPDATE)
	updateBoardArticle(@Payload() { memberId, input }: { memberId: string; input: BoardArticleUpdate }) {
		return this.boardArticleService.updateBoardArticle(toObjectId(memberId)!, input);
	}

	@MessagePattern(ARTICLE.LIST)
	getBoardArticles(@Payload() { memberId, input }: { memberId: string | null; input: BoardArticlesInquiry }) {
		return this.boardArticleService.getBoardArticles(toObjectId(memberId), input);
	}

	@MessagePattern(ARTICLE.LIKE)
	likeTargetBoardArticle(@Payload() { memberId, likeRefId }: { memberId: string; likeRefId: string }) {
		return this.boardArticleService.likeTargetBoardArticle(toObjectId(memberId)!, toObjectId(likeRefId)!);
	}

	@MessagePattern(ARTICLE.ADMIN_LIST)
	getAllBoardArticlesByAdmin(@Payload() input: AllBoardArticlesInquiry) {
		return this.boardArticleService.getAllBoardArticlesByAdmin(input);
	}

	@MessagePattern(ARTICLE.ADMIN_UPDATE)
	updateBoardArticleByAdmin(@Payload() input: BoardArticleUpdate) {
		return this.boardArticleService.updateBoardArticleByAdmin(input);
	}

	@MessagePattern(ARTICLE.ADMIN_REMOVE)
	removeBoardArticleByAdmin(@Payload() articleId: string) {
		return this.boardArticleService.removeBoardArticleByAdmin(toObjectId(articleId)!);
	}

	@MessagePattern(ARTICLE.STATS)
	boardArticleStatsEditor(@Payload() input: StatisticModifier) {
		return this.boardArticleService.boardArticleStatsEditor(input);
	}

	/** COMMENT **/
	@MessagePattern(COMMENT.CREATE)
	createComment(@Payload() { memberId, input }: { memberId: string; input: CommentInput }) {
		return this.commentService.createComment(toObjectId(memberId)!, input);
	}

	@MessagePattern(COMMENT.UPDATE)
	updateComment(@Payload() { memberId, input }: { memberId: string; input: CommentUpdate }) {
		return this.commentService.updateComment(toObjectId(memberId)!, input);
	}

	@MessagePattern(COMMENT.LIST)
	getComments(@Payload() { input }: { memberId: string | null; input: CommentsInquiry }) {
		return this.commentService.getComments(input);
	}

	@MessagePattern(COMMENT.ADMIN_REMOVE)
	removeCommentByAdmin(@Payload() commentId: string) {
		return this.commentService.removeCommentByAdmin(toObjectId(commentId)!);
	}
}
