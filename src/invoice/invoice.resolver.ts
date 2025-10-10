import { Resolver } from '@nestjs/graphql';
import { InvoiceService } from './invoice.service';
import { Mutation, Args } from '@nestjs/graphql';
import { Invoice } from './entities/invoice.entity';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import type { FileUpload } from 'graphql-upload/GraphQLUpload.mjs';
import { Query } from '@nestjs/graphql';

@Resolver()
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Query(() => Invoice)
  async getInvoice(@Args('id') id: string): Promise<Invoice> {
    return this.invoiceService.getInvoice(id);
  }

  @Mutation(() => Invoice)  
  async analyzeInvoice(
    @Args({name: 'file', type: () => GraphQLUpload}) file: FileUpload,
  ): Promise<Invoice> {
    if (!file) {
      throw new Error('File is required');
    }

    return await this.invoiceService.analyzeInvoice(file);
  }
}
