import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { ARTICLE, COMMUNITY_SERVICE, rpcCall } from '@app/common';
import { BoardArticle, BoardArticles } from '@app/common/dto/board-article/board-article';
import {
	AllBoardArticlesInquiry,
	BoardArticleInput,
	BoardArticlesInquiry,
} from '@app/common/dto/board-article/board-article.input';
import { BoardArticleUpdate } from '@app/common/dto/board-article/board-article.update';
import { MemberType } from '@app/common/enums/member.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class BoardArticleResolver {
	constructor(@Inject(COMMUNITY_SERVICE) private readonly communityClient: ClientProxy) {}

	@UseGuards(AuthGuard)
	@Mutation(() => BoardArticle)
	public async createBoardArticle(
		@Args('input') input: BoardArticleInput,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<BoardArticle> {
		console.log('Mutation: createBoardArticle');
		return await rpcCall(this.communityClient, ARTICLE.CREATE, { memberId, input });
	}

	@UseGuards(WithoutGuard)
	@Query(() => BoardArticle)
	public async getBoardArticle(
		@Args('articleId') articleId: string,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<BoardArticle> {
		console.log('Query: getBoardArticle');
		return await rpcCall(this.communityClient, ARTICLE.GET, { memberId, articleId });
	}

	@UseGuards(AuthGuard)
	@Mutation(() => BoardArticle)
	public async updateBoardArticle(
		@Args('input') input: BoardArticleUpdate,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<BoardArticle> {
		console.log('Mutation: updateBoardArticle');
		return await rpcCall(this.communityClient, ARTICLE.UPDATE, { memberId, input });
	}

	@UseGuards(WithoutGuard)
	@Query(() => BoardArticles)
	public async getBoardArticles(
		@Args('input') input: BoardArticlesInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<BoardArticles> {
		console.log('Query: getBoardArticles');
		return await rpcCall(this.communityClient, ARTICLE.LIST, { memberId, input });
	}

	/** LIKE **/

	@UseGuards(AuthGuard)
	@Mutation(() => BoardArticle)
	public async likeTargetBoardArticle(
		@Args('articleId') likeRefId: string,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<BoardArticle> {
		console.log('Mutation: likeTargetBoardArticle');
		return await rpcCall(this.communityClient, ARTICLE.LIKE, { memberId, likeRefId });
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => BoardArticles)
	public async getAllBoardArticlesByAdmin(@Args('input') input: AllBoardArticlesInquiry): Promise<BoardArticles> {
		console.log('Query: getAllBoardArticlesByAdmin');
		return await rpcCall(this.communityClient, ARTICLE.ADMIN_LIST, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => BoardArticle)
	public async updateBoardArticleByAdmin(@Args('input') input: BoardArticleUpdate): Promise<BoardArticle> {
		console.log('Mutation: updateBoardArticleByAdmin');
		return await rpcCall(this.communityClient, ARTICLE.ADMIN_UPDATE, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => BoardArticle)
	public async removeBoardArticleByAdmin(@Args('articleId') articleId: string): Promise<BoardArticle> {
		console.log('Mutation: removeBoardArticleByAdmin');
		return await rpcCall(this.communityClient, ARTICLE.ADMIN_REMOVE, articleId);
	}
}
