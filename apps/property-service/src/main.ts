import 'dotenv/config';
import { bootstrapService, PROPERTY_SERVICE } from '@app/common';
import { PropertyServiceModule } from './property-service.module';

bootstrapService(PropertyServiceModule, PROPERTY_SERVICE);
