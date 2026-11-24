import 'dotenv/config';
import { bootstrapService, MEMBER_SERVICE } from '@app/common';
import { MemberServiceModule } from './member-service.module';

bootstrapService(MemberServiceModule, MEMBER_SERVICE);
