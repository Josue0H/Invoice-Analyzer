import { Resolver } from '@nestjs/graphql';
import { VendorService } from './vendor.service';
import { Query } from '@nestjs/graphql';
import { Vendor } from './entities/vendor.entity';

@Resolver()
export class VendorResolver {
  constructor(private readonly vendorService: VendorService) {}

  @Query(() => [Vendor])
  async getVendors(): Promise<Vendor[]> {
    return this.vendorService.getVendors();
  }
}