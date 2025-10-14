import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { Injectable } from '@nestjs/common';
import { LangchainService } from '../langchain/langchain.service';

type AnalyzePayload = { invoiceId: number; filePath: string };

@Processor('invoice')
@Injectable()
export class InvoiceProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    private readonly langchainService: LangchainService
  ) {
      super();
  }

  async process(job: Job<AnalyzePayload>) {
    const { invoiceId, filePath } = job.data;

    try {
      const { extraction, vendorDecision } = await this.langchainService.analyzeDocument(filePath, invoiceId.toString());

      await this.invoiceRepo.update(invoiceId, {
        status: 'processed',
        data: JSON.stringify(extraction),
      });

      return { extraction, vendorDecision };
    } catch (err: any) {
      await this.invoiceRepo.update(invoiceId, {
        status: 'failed',
      });
      throw err;
    }
  }
}
