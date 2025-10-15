import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

@ObjectType()
export class LlmMessageEvent {
  @Field() kind: string; 
  @Field({ nullable: true }) text?: string;
  @Field(() => GraphQLJSONObject, { nullable: true }) json?: any;
  @Field({ nullable: true }) toolName?: string;
  @Field({ nullable: true }) invoiceId?: string;
  @Field() createdAt: string;
}
