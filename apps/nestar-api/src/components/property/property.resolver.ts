import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import * as mongoose from 'mongoose';
import { PROPERTY, PROPERTY_SERVICE, rpcCall, SOCIAL, SOCIAL_SERVICE } from '@app/common';
import { Properties, Property } from '@app/common/dto/property/property';
import {
	AgentsPropertiesInquiry,
	AllPropertiesInquiry,
	OrdinaryInquiry,
	PropertiesInquiry,
	PropertyInput,
} from '@app/common/dto/property/property.input';
import { PropertyUpdate } from '@app/common/dto/property/property.update';
import { MemberType } from '@app/common/enums/member.enum';
import { shapeIntoMongoObjectId } from '@app/common/config';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class PropertyResolver {
	constructor(
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
		@Inject(SOCIAL_SERVICE) private readonly socialClient: ClientProxy,
	) {}

	@Roles(MemberType.AGENT)
	@UseGuards(AuthGuard, RolesGuard)
	@Mutation(() => Property)
	public async createProperty(
		@Args('input') input: PropertyInput,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Property> {
		console.log('Mutation: createProperty');
		input.memberId = memberId; // trust the token, not the client
		return await rpcCall(this.propertyClient, PROPERTY.CREATE, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Property)
	public async getProperty(
		@Args('propertyId') input: string,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Property> {
		console.log('Query: getProperty');
		const propertyId = shapeIntoMongoObjectId(input);
		return await rpcCall(this.propertyClient, PROPERTY.GET, { memberId, propertyId });
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async updateProperty(
		@Args('input') input: PropertyUpdate,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Property> {
		console.log('Mutation: updateProperty');
		return await rpcCall(this.propertyClient, PROPERTY.UPDATE, { memberId, input });
	}

	@UseGuards(WithoutGuard)
	@Query(() => Properties)
	public async getProperties(
		@Args('input') input: PropertiesInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getProperties');
		return await rpcCall(this.propertyClient, PROPERTY.LIST, { memberId, input });
	}

	/** favorites and recently-visited are owned by social-service (likes / views) */
	@UseGuards(AuthGuard)
	@Query(() => Properties)
	public async getFavorites(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getFavorites');
		return await rpcCall(this.socialClient, SOCIAL.LIKE_FAVORITES, { memberId, input });
	}

	@UseGuards(AuthGuard)
	@Query(() => Properties)
	public async getVisited(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getVisited');
		return await rpcCall(this.socialClient, SOCIAL.VIEW_VISITED, { memberId, input });
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => Properties)
	public async getAgentsProperies(
		@Args('input') input: AgentsPropertiesInquiry,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Properties> {
		console.log('Query: getAgentsProperies');
		return await rpcCall(this.propertyClient, PROPERTY.AGENT_LIST, { memberId, input });
	}

	/** LIKE **/

	@UseGuards(AuthGuard)
	@Mutation(() => Property)
	public async likeTargetProperty(
		@Args('propertyId') input: string,
		@AuthMember('_id') memberId: mongoose.Types.ObjectId,
	): Promise<Property> {
		console.log('Mutation: likeTargetProperty');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await rpcCall(this.propertyClient, PROPERTY.LIKE, { memberId, likeRefId });
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Properties)
	public async getAllPropertiesByAdmin(@Args('input') input: AllPropertiesInquiry): Promise<Properties> {
		console.log('Query: getAllPropertiesByAdmin');
		return await rpcCall(this.propertyClient, PROPERTY.ADMIN_LIST, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async updatePropertyByAdmin(@Args('input') input: PropertyUpdate): Promise<Property> {
		console.log('Mutation: updatePropertyByAdmin');
		return await rpcCall(this.propertyClient, PROPERTY.ADMIN_UPDATE, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Property)
	public async removePropertyByAdmin(@Args('propertyId') input: string): Promise<Property> {
		console.log('Mutation: removePropertyByAdmin');
		return await rpcCall(this.propertyClient, PROPERTY.ADMIN_REMOVE, input);
	}
}
