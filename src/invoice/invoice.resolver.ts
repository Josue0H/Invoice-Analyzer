import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InvoiceService } from './invoice.service';
import { Mutation, Args, Subscription } from '@nestjs/graphql';
import { Invoice } from './entities/invoice.entity';
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs';
import type { FileUpload } from 'graphql-upload/GraphQLUpload.mjs';
import { Query } from '@nestjs/graphql';

import { Inject } from '@nestjs/common';
import { PubSubEngine } from 'graphql-subscriptions';
import { LlmMessageEvent } from 'src/graphql/llm-message.event';

@Resolver()
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService, @Inject("PubSub") private pubSub: PubSubEngine) {}

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

  @Subscription(() => LlmMessageEvent, {
    name: 'llmMessages',
    filter: (payload, variables) => {
      return payload.llmMessages.invoiceId === variables.invoiceId;
    }
  })
  invoiceUpdated(@Args('invoiceId') invoiceId: string) {
    const response = this.pubSub.asyncIterableIterator(`llm:${invoiceId}`);
    return response;
  }
}
