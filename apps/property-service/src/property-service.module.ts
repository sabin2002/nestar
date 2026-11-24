import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, MEMBER_SERVICE, RpcClientsModule, SOCIAL_SERVICE } from '@app/common';
import PropertySchema from '@app/common/schemas/Property.model';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule.forService('nestar_property'),
		MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
		RpcClientsModule.register([MEMBER_SERVICE, SOCIAL_SERVICE]),
	],
	controllers: [PropertyController],
	providers: [PropertyService],
})
export class PropertyServiceModule {}
