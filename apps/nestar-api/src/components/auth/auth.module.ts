import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';

/** The gateway only verifies JWTs. Tokens are created by member-service (same SECRET_TOKEN). */
@Module({
	imports: [JwtModule.register({ secret: `${process.env.SECRET_TOKEN}` })],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
