import { Injectable } from '@nestjs/common';
import { FileUpload } from 'graphql-upload/processRequest.mjs';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { Invoice } from './entities/invoice.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';


@Injectable()
export class InvoiceService {
    constructor(@InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>, @InjectQueue("invoice") private invoiceQueue: Queue) {}

    async analyzeInvoice(file: FileUpload): Promise<Invoice> {
        const { createReadStream, filename } = await file;

        const stream = createReadStream();

        const path = join(__dirname, '..', '..', 'uploads', filename);

        await new Promise((resolve, reject) => {
            const writeStream = createWriteStream(path);
            stream
                .pipe(writeStream)
                .on('finish', () => {
                    console.log('File written successfully');
                    resolve(true);
                })
                .on('error', reject);
        });

        const invoice = await this.invoiceRepo.save(
            this.invoiceRepo.create({
                filename: filename,
                status: "processing",
                createdAt: new Date(),
            })
        );
        
        await this.invoiceQueue.add('analyze', {
            invoiceId: invoice.id,
            filePath: path,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });

        return invoice;
    }

    async getInvoice(id: string): Promise<Invoice> {
        const invoice = await this.invoiceRepo.findOne({
            where: { id: Number(id) },
            relations: { vendor: true },
        });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        return invoice;
    }

    async linkVendor(invoiceId: string, vendorId: string): Promise<Invoice> {
        const invoice = await this.invoiceRepo.findOneBy({ id: Number(invoiceId) });
        if (!invoice) {
            throw new Error('Invoice not found');
        }
        invoice.vendorId = vendorId;
        return this.invoiceRepo.save(invoice);
    }
}
