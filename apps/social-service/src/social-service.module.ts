import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule, MEMBER_SERVICE, PROPERTY_SERVICE, RpcClientsModule } from '@app/common';
import LikeSchema from '@app/common/schemas/Like.model';
import ViewSchema from '@app/common/schemas/View.model';
import FollowSchema from '@app/common/schemas/Follow.model';
import { SocialController } from './social.controller';
import { LikeService } from './like.service';
import { ViewService } from './view.service';
import { FollowService } from './follow.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule.forService('nestar_social'),
		MongooseModule.forFeature([
			{ name: 'Like', schema: LikeSchema },
			{ name: 'View', schema: ViewSchema },
			{ name: 'Follow', schema: FollowSchema },
		]),
		RpcClientsModule.register([MEMBER_SERVICE, PROPERTY_SERVICE]),
	],
	controllers: [SocialController],
	providers: [LikeService, ViewService, FollowService],
})
export class SocialServiceModule {}
