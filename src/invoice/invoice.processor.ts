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
    private readonly langchainService: LangchainService,
  ) {
      super();
  }

  async process(job: Job<AnalyzePayload>) {
    const { invoiceId, filePath } = job.data;

    try {
      const content = await this.langchainService.analyzeDocument(filePath);

      await this.invoiceRepo.update(invoiceId, {
        status: 'processed',
        data: JSON.stringify(content),
      });

      return content;
    } catch (err: any) {
      await this.invoiceRepo.update(invoiceId, {
        status: 'failed',
      });
      throw err;
    }
  }
}
