import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MEMBER, toObjectId } from '@app/common';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '@app/common/dto/member/member.input';
import { MemberUpdate } from '@app/common/dto/member/member.update';
import type { StatisticModifier } from '@app/common/types/common';
import { MemberService } from './member.service';

@Controller()
export class MemberController {
	constructor(private readonly memberService: MemberService) {}

	@MessagePattern(MEMBER.SIGNUP)
	signup(@Payload() input: MemberInput) {
		return this.memberService.signup(input);
	}

	@MessagePattern(MEMBER.LOGIN)
	login(@Payload() input: LoginInput) {
		return this.memberService.login(input);
	}

	@MessagePattern(MEMBER.UPDATE)
	updateMember(@Payload() { memberId, input }: { memberId: string; input: MemberUpdate }) {
		return this.memberService.updateMember(toObjectId(memberId)!, input);
	}

	@MessagePattern(MEMBER.GET)
	getMember(@Payload() { memberId, targetId }: { memberId: string | null; targetId: string }) {
		return this.memberService.getMember(toObjectId(memberId), toObjectId(targetId)!);
	}

	@MessagePattern(MEMBER.AGENTS)
	getAgents(@Payload() { memberId, input }: { memberId: string | null; input: AgentsInquiry }) {
		return this.memberService.getAgents(toObjectId(memberId), input);
	}

	@MessagePattern(MEMBER.LIKE)
	likeTargetMember(@Payload() { memberId, likeRefId }: { memberId: string; likeRefId: string }) {
		return this.memberService.likeTargetMember(toObjectId(memberId)!, toObjectId(likeRefId)!);
	}

	@MessagePattern(MEMBER.ADMIN_LIST)
	getAllMembersByAdmin(@Payload() input: MembersInquiry) {
		return this.memberService.getAllMembersByAdmin(input);
	}

	@MessagePattern(MEMBER.ADMIN_UPDATE)
	updateMemberByAdmin(@Payload() input: MemberUpdate) {
		return this.memberService.updateMemberByAdmin(input);
	}

	@MessagePattern(MEMBER.STATS)
	memberStatsEditor(@Payload() input: StatisticModifier) {
		return this.memberService.memberStatsEditor(input);
	}

	@MessagePattern(MEMBER.BY_IDS)
	getMembersByIds(@Payload() ids: string[]) {
		return this.memberService.getMembersByIds(ids);
	}

	@MessagePattern(MEMBER.BATCH_ROLLBACK)
	batchRollback() {
		return this.memberService.batchRollback();
	}

	@MessagePattern(MEMBER.BATCH_RANK)
	batchTopAgents() {
		return this.memberService.batchTopAgents();
	}
}
