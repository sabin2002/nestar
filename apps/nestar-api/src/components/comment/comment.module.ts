import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommentResolver } from './comment.resolver';

@Module({
	imports: [AuthModule],
	providers: [CommentResolver],
})
export class CommentModule {}
