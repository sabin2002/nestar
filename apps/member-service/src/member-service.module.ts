import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule, RpcClientsModule, SOCIAL_SERVICE } from '@app/common';
import MemberSchema from '@app/common/schemas/Member.model';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { TokenService } from './token.service';

@Module({
	imports: [
		ConfigModule.forRoot(),
		DatabaseModule.forService('nestar_member'),
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		JwtModule.register({ secret: `${process.env.SECRET_TOKEN}`, signOptions: { expiresIn: '30d' } }),
		RpcClientsModule.register([SOCIAL_SERVICE]),
	],
	controllers: [MemberController],
	providers: [MemberService, TokenService],
})
export class MemberServiceModule {}
