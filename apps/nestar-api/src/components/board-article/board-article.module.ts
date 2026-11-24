import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BoardArticleResolver } from './board-article.resolver';

@Module({
	imports: [AuthModule],
	providers: [BoardArticleResolver],
})
export class BoardArticleModule {}
