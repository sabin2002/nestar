import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { T } from '@app/common/types/common';
import { SocketModule } from './socket/socket.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		GraphQLModule.forRoot({
			driver: ApolloDriver,
			context: ({ req, res }) => ({ req, res }),
			playground: true,
			uploads: false,
			autoSchemaFile: true,
			formatError: (error: T) => {    // changing global errors to CUSTOMIZED errors and we can send it to frontend
				const graphQLFormattedError = {
					code: error?.extensions.code,
					message:
						error?.extensions?.exception?.response?.message || error?.extenions?.response?.message || error?.message,
				};
				console.log('GRAPHQL GLOBAL ERROR: ', graphQLFormattedError);
				return graphQLFormattedError;
			},
		}),
		ComponentsModule, // GraphQL resolvers -> microservices over TCP
		SocketModule, // WebSocket live chat + AI assistant
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}
