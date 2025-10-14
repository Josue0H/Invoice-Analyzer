// langchain-tools.ts
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { VendorService } from '../../vendor/vendor.service';
import { InvoiceService } from '../../invoice/invoice.service';

const VendorCreateSchema = z.object({
  displayName: z.string(),
  taxId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  iban: z.string().optional(),
});

type VendorCreate = z.infer<typeof VendorCreateSchema>;

@Injectable()
export class LangchainTools {
  constructor(private readonly vendorService: VendorService, private readonly invoiceService: InvoiceService) {}

  public readonly similarVendorsTool = tool(
    async ({ name }: { name: string }) => {
      return await JSON.stringify(await this.vendorService.findSimilar(name, 5));
    },
    {
      name: 'similar_vendors',
      description:
        "Get a list of vendors similar to the given name. Input should be a JSON object with a 'name' field.",
      schema: z.object({
        name: z.string().describe('The name of the vendor to find similar vendors for'),
      }),
    },
  );

  public readonly createVendorTool = tool(
    async (input: VendorCreate) => {
      const vendor = await this.vendorService.createVendor(input);
      return vendor;
    },
    {
      name: 'create_vendor',
      description:
        "Create a new vendor with the given name. Input should be a JSON object with a 'name' field.",
      schema: VendorCreateSchema,
    },
  );

  public readonly linkVendorTool = tool(
    async ({ vendorId, invoiceId }: { vendorId: string; invoiceId: string }) => {
      return await this.invoiceService.linkVendor(invoiceId, vendorId);
    },
    {
      name: 'link_vendor',
      description:
        "Link an existing vendor with the given ID. Input should be a JSON object with a 'vendorId' field.",
      schema: z.object({
        vendorId: z.string().describe('The ID of the vendor to link'),
        invoiceId: z.string().describe('The ID of the invoice to link the vendor to'),
      }),
    },
  );

  getTools() {
    return [this.similarVendorsTool, this.createVendorTool, this.linkVendorTool];
  }
}
