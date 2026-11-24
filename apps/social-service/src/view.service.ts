import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plain, PROPERTY, PROPERTY_SERVICE, rpcCall, toObjectId } from '@app/common';
import { View } from '@app/common/dto/view/view';
import { ViewInput } from '@app/common/dto/view/view.input';
import { OrdinaryInquiry } from '@app/common/dto/property/property.input';
import { Properties, Property } from '@app/common/dto/property/property';
import { ViewGroup } from '@app/common/enums/view.enum';
import { T } from '@app/common/types/common';

@Injectable()
export class ViewService {
	constructor(
		@InjectModel('View') private readonly viewModel: Model<View>,
		@Inject(PROPERTY_SERVICE) private readonly propertyClient: ClientProxy,
	) {}

	/** Returns the new view, or null if this member already viewed the target (so counters only go up once). */
	public async recordView(input: ViewInput): Promise<View | null> {
		const search: T = { memberId: toObjectId(input.memberId), viewRefId: toObjectId(input.viewRefId) };
		const viewExist = await this.viewModel.findOne(search).exec();
		if (viewExist) return null;
		return plain(await this.viewModel.create(input));
	}

	public async getVisitedProperties(memberId: Types.ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.PROPERTY, memberId };

		const [views, total] = await Promise.all([
			this.viewModel
				.find(match)
				.sort({ updatedAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean()
				.exec(),
			this.viewModel.countDocuments(match).exec(),
		]);

		const list = await rpcCall<Property[]>(
			this.propertyClient,
			PROPERTY.BY_IDS,
			views.map((view: any) => String(view.viewRefId)),
		);
		return { list, metaCounter: total ? [{ total }] : [] };
	}
}
