import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FollowResolver } from './follow.resolver';

@Module({
	imports: [AuthModule],
	providers: [FollowResolver],
})
export class FollowModule {}
