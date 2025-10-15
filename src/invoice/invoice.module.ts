import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceResolver } from './invoice.resolver';
import { LangchainService } from '../langchain/langchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceProcessor } from './invoice.processor';
import { LangchainTools } from '../langchain/tools/tools';
import { VendorService } from 'src/vendor/vendor.service';
import { Vendor } from 'src/vendor/entities/vendor.entity';
import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Vendor]),
    BullModule.registerQueue({ name: 'invoice' })    
  ],
  providers: [
    {
      provide: 'PubSub',
      useValue: new PubSub(),
    },
    InvoiceResolver, 
    InvoiceService,
    LangchainService, 
    InvoiceProcessor, 
    LangchainTools, 
    VendorService
  ],
})
export class InvoiceModule {}
