import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Member } from '@app/common/dto/member/member';
import { T } from '@app/common/types/common';

/** Password hashing + JWT signing. Only the member service creates tokens; the gateway only verifies them. */
@Injectable()
export class TokenService {
	constructor(private jwtService: JwtService) {}

	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(member: Member): Promise<string> {
		const source: T = (member as any)?.['_doc'] ?? member;
		const payload: T = {};
		Object.keys(source).forEach((key) => (payload[key] = (member as any)[key]));
		delete payload.memberPassword;
		delete payload.accessToken;
		return await this.jwtService.signAsync(JSON.parse(JSON.stringify(payload)));
	}
}
