import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { VendorResolver } from './vendor.resolver';
import { Vendor } from './entities/vendor.entity';
import { VendorService } from './vendor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    BullModule.registerQueue({ name: 'vendor' })    
  ],
  providers: [VendorResolver, VendorService],
})
export class VendorModule {}
