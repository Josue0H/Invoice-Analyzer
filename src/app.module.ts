import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice/entities/invoice.entity';
import { GraphQLModule } from '@nestjs/graphql';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Vendor } from './vendor/entities/vendor.entity';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { VendorModule } from './vendor/vendor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      subscriptions:{
        "graphql-ws": {
          path: '/graphql',
        }
      }
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'langchain_analyzer',
      entities: [__dirname + '/**/*.entity.{ts,js}', Invoice],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Invoice, Vendor]),
    InvoiceModule,
    VendorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
