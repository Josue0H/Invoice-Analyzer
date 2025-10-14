import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from './entities/vendor.entity';

type VendorCreate = {
  displayName: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  iban?: string;
};

@Injectable()
export class VendorService {
    constructor(@InjectRepository(Vendor) private vendorRepo: Repository<Vendor>) {}

    async getVendors(): Promise<Vendor[]> {
        return this.vendorRepo.find();
    }

    async findSimilar(name: string, limit: number): Promise<Vendor[]> {
        return this.vendorRepo
            .createQueryBuilder('vendor')
            .where('vendor.displayName ILIKE :name', { name: `%${name}%` })
            .orderBy('vendor.displayName', 'ASC')
            .limit(limit ?? 10)
            .getMany();
    }

    async createVendor(input: VendorCreate): Promise<Vendor> {
        const vendor = this.vendorRepo.create(input);
        return this.vendorRepo.save(vendor);
    }
}
