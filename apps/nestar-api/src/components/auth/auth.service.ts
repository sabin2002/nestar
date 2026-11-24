import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Member } from '@app/common/dto/member/member';
import { shapeIntoMongoObjectId } from '@app/common/config';

@Injectable()
export class AuthService {
	constructor(private jwtService: JwtService) {}

	public async verifyToken(token: string): Promise<Member> {
		const member = await this.jwtService.verifyAsync(token);
		member._id = shapeIntoMongoObjectId(member._id);
		return member;
	}
}
