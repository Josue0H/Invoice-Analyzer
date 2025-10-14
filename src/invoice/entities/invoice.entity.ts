import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';
import { GraphQLObjectType } from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import { Vendor } from 'src/vendor/entities/vendor.entity';
import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Invoice {
  @Field(() => Number)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  @Column()
  filename: string;

  @Field(() => String, { nullable: true })
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

  @Field(() => String)
  @Column()
  status: string;

  @Field(() => GraphQLISODateTime)
  @Column()
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column({ nullable: true })
  updatedAt: Date;

  @Field(() => String, { nullable: true })
  @Index()
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null;

  @Field(() => Vendor, { nullable: true })
  @ManyToOne(() => Vendor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;
}