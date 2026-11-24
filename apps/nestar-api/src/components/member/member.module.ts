import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MemberResolver } from './member.resolver';

@Module({
	imports: [AuthModule],
	providers: [MemberResolver],
})
export class MemberModule {}
