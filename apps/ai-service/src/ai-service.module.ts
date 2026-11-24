import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PROPERTY_SERVICE, RpcClientsModule } from '@app/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OllamaClient } from './ollama.client';

@Module({
	imports: [ConfigModule.forRoot(), RpcClientsModule.register([PROPERTY_SERVICE])],
	controllers: [AiController],
	providers: [AiService, OllamaClient],
})
export class AiServiceModule {}
