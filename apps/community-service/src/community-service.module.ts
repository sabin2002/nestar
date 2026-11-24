import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, MEMBER_SERVICE, PROPERTY_SERVICE, RpcClientsModule, SOCIAL_SERVICE } from '@app/common';
import BoardArticleSchema from '@app/common/schemas/BoardArticle.model';
import CommentSchema from '@app/common/schemas/Comment.model';
import { CommunityController } from './community.controller';
import { BoardArticleService } from './board-article.service';
import { CommentService } from './comment.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule.forService('nestar_community'),
		MongooseModule.forFeature([
			{ name: 'BoardArticle', schema: BoardArticleSchema },
			{ name: 'Comment', schema: CommentSchema },
		]),
		RpcClientsModule.register([MEMBER_SERVICE, PROPERTY_SERVICE, SOCIAL_SERVICE]),
	],
	controllers: [CommunityController],
	providers: [BoardArticleService, CommentService],
})
export class CommunityServiceModule {}
