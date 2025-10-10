import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLObjectType } from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Invoice {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  filename: string;

  @Field({ nullable: true, })
  @Column({ nullable: true })
  data: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  get parsedData(): any {
    try {
      return this.data ? JSON.parse(this.data) : null;
    } catch (error) {
      return null;
    }
  }

  @Field()
  @Column()
  status: string;

  @Field()
  @Column()
  createdAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  updatedAt: Date;
}