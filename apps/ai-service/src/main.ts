import 'dotenv/config';
import { AI_SERVICE, bootstrapService } from '@app/common';
import { AiServiceModule } from './ai-service.module';

bootstrapService(AiServiceModule, AI_SERVICE);
