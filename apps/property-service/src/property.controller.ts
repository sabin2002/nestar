import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PROPERTY, toObjectId } from '@app/common';
import {
	AgentsPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '@app/common/dto/property/property.input';
import { PropertyUpdate } from '@app/common/dto/property/property.update';
import type { StatisticModifier } from '@app/common/types/common';
import { PropertyService } from './property.service';

@Controller()
export class PropertyController {
	constructor(private readonly propertyService: PropertyService) {}

	@MessagePattern(PROPERTY.CREATE)
	createProperty(@Payload() input: PropertyInput) {
		return this.propertyService.createProperty(input);
	}

	@MessagePattern(PROPERTY.GET)
	getProperty(@Payload() { memberId, propertyId }: { memberId: string | null; propertyId: string }) {
		return this.propertyService.getProperty(toObjectId(memberId), toObjectId(propertyId)!);
	}

	@MessagePattern(PROPERTY.UPDATE)
	updateProperty(@Payload() { memberId, input }: { memberId: string; input: PropertyUpdate }) {
		return this.propertyService.updateProperty(toObjectId(memberId)!, input);
	}

	@MessagePattern(PROPERTY.LIST)
	getProperties(@Payload() { memberId, input }: { memberId: string | null; input: PropertiesInquiry }) {
		return this.propertyService.getProperties(toObjectId(memberId), input);
	}

	@MessagePattern(PROPERTY.AGENT_LIST)
	getAgentsProperties(@Payload() { memberId, input }: { memberId: string; input: AgentsPropertiesInquiry }) {
		return this.propertyService.getAgentsProperties(toObjectId(memberId)!, input);
	}

	@MessagePattern(PROPERTY.LIKE)
	likeTargetProperty(@Payload() { memberId, likeRefId }: { memberId: string; likeRefId: string }) {
		return this.propertyService.likeTargetProperty(toObjectId(memberId)!, toObjectId(likeRefId)!);
	}

	@MessagePattern(PROPERTY.ADMIN_LIST)
	getAllPropertiesByAdmin(@Payload() input: AllPropertiesInquiry) {
		return this.propertyService.getAllPropertiesByAdmin(input);
	}

	@MessagePattern(PROPERTY.ADMIN_UPDATE)
	updatePropertyByAdmin(@Payload() input: PropertyUpdate) {
		return this.propertyService.updatePropertyByAdmin(input);
	}

	@MessagePattern(PROPERTY.ADMIN_REMOVE)
	removePropertyByAdmin(@Payload() propertyId: string) {
		return this.propertyService.removePropertyByAdmin(toObjectId(propertyId)!);
	}

	@MessagePattern(PROPERTY.STATS)
	propertyStatsEditor(@Payload() input: StatisticModifier) {
		return this.propertyService.propertyStatsEditor(input);
	}

	@MessagePattern(PROPERTY.BY_IDS)
	getPropertiesByIds(@Payload() ids: string[]) {
		return this.propertyService.getPropertiesByIds(ids);
	}

	@MessagePattern(PROPERTY.FOR_AI)
	getPropertiesForAi(@Payload() input: { text?: string; limit?: number }) {
		return this.propertyService.getPropertiesForAi(input);
	}

	@MessagePattern(PROPERTY.BATCH_ROLLBACK)
	batchRollback() {
		return this.propertyService.batchRollback();
	}

	@MessagePattern(PROPERTY.BATCH_RANK)
	batchTopProperties() {
		return this.propertyService.batchTopProperties();
	}
}
