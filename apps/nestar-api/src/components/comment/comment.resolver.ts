import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import mongoose from 'mongoose';
import { COMMENT, COMMUNITY_SERVICE, rpcCall } from '@app/common';
import { Comment, Comments } from '@app/common/dto/comment/comment';
import { CommentInput, CommentsInquiry } from '@app/common/dto/comment/comment.input';
import { CommentUpdate } from '@app/common/dto/comment/comment.update';
import { MemberType } from '@app/common/enums/member.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Resolver()
export class CommentResolver {
	constructor(@Inject(COMMUNITY_SERVICE) private readonly communityClient: ClientProxy) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Comment)
	public async createComment(
		@Args('input') input: CommentInput,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Comment> {
		console.log('Mutation: createComment');
		return await rpcCall(this.communityClient, COMMENT.CREATE, { memberId, input });
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Comment)
	public async updateComment(
		@Args('input') input: CommentUpdate,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Comment> {
		console.log('Mutation: updateComment');
		return await rpcCall(this.communityClient, COMMENT.UPDATE, { memberId, input });
	}

	@UseGuards(WithoutGuard)
	@Query(() => Comments)
	public async getComments(
		@Args('input') input: CommentsInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Comments> {
		console.log('Query: getComments');
		return await rpcCall(this.communityClient, COMMENT.LIST, { memberId, input });
	}

	/** ADMIN **/
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Comment)
	public async removeCommentByAdmin(@Args('commentId') commentId: string): Promise<Comment> {
		console.log('Mutation: removeCommentByAdmin');
		return await rpcCall(this.communityClient, COMMENT.ADMIN_REMOVE, commentId);
	}
}
