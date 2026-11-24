import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MEMBER_SERVICE, PROPERTY_SERVICE, RpcClientsModule } from '@app/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';

/**
 * The batch app is now a pure scheduler: it owns no database.
 * Each cron job asks the service that owns the data (property-service, member-service) to do the work over TCP.
 */
@Module({
	imports: [ConfigModule.forRoot(), ScheduleModule.forRoot(), RpcClientsModule.register([PROPERTY_SERVICE, MEMBER_SERVICE])],
	controllers: [BatchController],
	providers: [BatchService],
})
export class BatchModule {}
