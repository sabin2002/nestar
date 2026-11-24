import { Module } from '@nestjs/common';
import { ServiceClientsModule } from './service-clients.module';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';
import { PropertyModule } from './property/property.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { CommentModule } from './comment/comment.module';
import { FollowModule } from './follow/follow.module';
import { AiModule } from './ai/ai.module';

/**
 * API gateway components: GraphQL resolvers only.
 * Business logic and data live in the microservices (apps/*-service); resolvers forward calls over TCP.
 */
@Module({
	imports: [
		ServiceClientsModule,
		AuthModule,
		MemberModule,
		PropertyModule,
		BoardArticleModule,
		CommentModule,
		FollowModule,
		AiModule,
	],
})
export class ComponentsModule {}
