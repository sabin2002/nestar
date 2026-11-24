import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiResolver } from './ai.resolver';

@Module({
	imports: [AuthModule],
	providers: [AiResolver],
})
export class AiModule {}
