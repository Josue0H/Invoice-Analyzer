import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { z } from "zod";
import { promises as fsp } from "fs";

@Injectable()
export class LangchainService {
    private model: ChatVertexAI;

    constructor(private configService: ConfigService) {
        this.model = this.getStructuredModel();
    }

    async analyzeDocument(filePath: string): Promise<any> {

        const buf = await fsp.readFile(filePath);
        const pdfB64 = buf.toString('base64');

        const config = {
            runName: `${new Date().toISOString()}-invoice-analysis`,
            tags: ["demo", "invoice", "gemini-2.5-flash"],
            metadata: {
                customerId: "acme-001",
                source: "local-pdf",
            },
        };
        
        const response = await this.model.invoke([
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analyze this invoice and extract the information in a structured format."
                    },
                    {
                    type: "file",
                    source_type: "base64",
                    data: pdfB64,
                    mime_type: "application/pdf"
                    }
                ]
            }
        ], config)

        return response;
    }

    private getStructuredModel(): any {
        const model = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
            maxRetries: 3,
        });

        const invoiceSchema = z.object({
            invoiceNumber: z.string().describe("The invoice number"),
            date: z.string().describe("The invoice date in YYYY-MM-DD format"),
            totalAmount: z.string().describe("The total amount due on the invoice, including currency symbol"),
            vendor: z.object({
                name: z.string().describe("The name of the vendor or supplier"),
                address: z.string().describe("The address of the vendor or supplier"),
                contact: z.string().describe("The contact information of the vendor or supplier"),
            }).describe("Information about the vendor or supplier"),
            customer: z.object({
                name: z.string().describe("The name of the customer or client"),
                address: z.string().describe("The address of the customer or client"),
                contact: z.string().describe("The contact information of the customer or client"),
            }).describe("Information about the customer or client"),
            taxAmount: z.string().optional().describe("The total tax amount applied to the invoice, including currency symbol"),
            dueDate: z.string().optional().describe("The payment due date in YYYY-MM-DD format"),
        });

        const structuredModel = model.withStructuredOutput(invoiceSchema);

        return structuredModel;
    }
}