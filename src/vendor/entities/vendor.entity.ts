import { Field, ObjectType } from '@nestjs/graphql';
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
        
@Entity()
@ObjectType()
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Index({ fulltext: false })
  @Field(() => String)
  @Column()
  displayName: string;

  @Index({ unique: false })
  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  taxId?: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  iban?: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  email?: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  phone?: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  address?: string;
}