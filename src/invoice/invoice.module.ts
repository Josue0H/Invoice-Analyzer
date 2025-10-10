import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceResolver } from './invoice.resolver';
import { LangchainService } from '../langchain/langchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceProcessor } from './invoice.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    BullModule.registerQueue({ name: 'invoice' })    
  ],
  providers: [InvoiceResolver, InvoiceService, LangchainService, InvoiceProcessor],
})
export class InvoiceModule {}
