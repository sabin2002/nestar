import 'dotenv/config';
import { bootstrapService, SOCIAL_SERVICE } from '@app/common';
import { SocialServiceModule } from './social-service.module';

bootstrapService(SocialServiceModule, SOCIAL_SERVICE);
