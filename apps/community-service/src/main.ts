import 'dotenv/config';
import { bootstrapService, COMMUNITY_SERVICE } from '@app/common';
import { CommunityServiceModule } from './community-service.module';

bootstrapService(CommunityServiceModule, COMMUNITY_SERVICE);
