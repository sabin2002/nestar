import { DynamicModule, Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * Database-per-service: each microservice connects to the same MongoDB server
 * (MONGO_DEV / MONGO_PROD) but uses its own database name, e.g. nestar_member.
 * Override the name with MONGO_DB_NAME if needed.
 */
@Module({})
export class DatabaseModule {
	static forService(defaultDbName: string): DynamicModule {
		return {
			module: DatabaseModule,
			imports: [
				MongooseModule.forRootAsync({
					useFactory: () => {
						const isProd = process.env.NODE_ENV === 'production';
						const uri = isProd ? process.env.MONGO_PROD : process.env.MONGO_DEV;
						const dbName = process.env.MONGO_DB_NAME ?? defaultDbName;
						new Logger('Database').log(`using database "${dbName}" (${isProd ? 'production' : 'development'})`);
						return { uri, dbName };
					},
				}),
			],
			exports: [MongooseModule],
		};
	}
}
