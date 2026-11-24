import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PropertyResolver } from './property.resolver';

@Module({
	imports: [AuthModule],
	providers: [PropertyResolver],
})
export class PropertyModule {}
