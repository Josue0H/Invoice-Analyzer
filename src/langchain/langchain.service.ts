import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { z } from "zod";
import { promises as fsp } from "fs";
import { LangchainTools } from "./tools/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Inject } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";

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

type InvoiceExtract = z.infer<typeof invoiceSchema>;

@Injectable()
export class LangchainService {
    constructor(
        private configService: ConfigService,
        private readonly langchainTools: LangchainTools,
        @Inject('PubSub') private pubSub: PubSub,
    ) {}

    async analyzeDocument(filePath: string, invoiceId: string): Promise<any> {

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

        const model = this.getStructuredModel();

        this.pubSub.publish(`llm:${invoiceId}`, {
            llmMessages: {
                kind: 'run_started',
                text: `Starting invoice analysis for invoiceId ${invoiceId}`,
                invoiceId,
                createdAt: new Date().toISOString(),
            }
        });

        const response = await model.invoke([
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Extract the invoice data from the attached PDF file and return it in a structured JSON format as specified.",
                    },
                    {
                    type: "file",
                    source_type: "base64",
                    data: pdfB64,
                    mime_type: "application/pdf"
                    }
                ]
            }
        ], config);        

        this.pubSub.publish(`llm:${invoiceId}`, {
            llmMessages: {
                kind: 'data_extracted',
                text: `Data extracted for invoiceId ${invoiceId}`,
                invoiceId,
                json: response,
                createdAt: new Date().toISOString(),
            }
        });

        await this.matchOrcreateVendor(response, invoiceId);

        this.pubSub.publish(`llm:${invoiceId}`, {
            llmMessages: {
                kind: 'process_completed',
                text: `Invoice analysis completed for invoiceId ${invoiceId}`,
                json: response,
                invoiceId,
                createdAt: new Date().toISOString(),
            }
        });

        return response;
    }

    async matchOrcreateVendor(ex: InvoiceExtract, invoiceId?: string) {
        const agent = this.getAgent();

        const input = {
            messages: [                
                {
                    role: "user",
                    content: `
                        You must operate with simple visible fields only (name/email/address). Policy:

                        1) Call similar_vendors to find candidates based on the name.

                        2) If ANY candidate has the SAME email (case-insensitive) or you consider the vendor to be the same, you MUST link to that candidate (call link_invoice_vendor and STOP).
                        3) Else, if ANY candidate has the SAME normalized displayName (lowercase, unaccent, trimmed), you MUST link to that candidate (call link_invoice_vendor and STOP).
                        4) Otherwise, call create_vendor using ONLY this schema:
                        { "displayName", "taxId", "email", "phone", "address", "iban" }
                        Then call link_invoice_vendor with the created id.

                        Return final JSON:
                        {"action":"link"|"create","vendorId":"...","created":boolean,"reason":"..."}.
                        Do not invent fields. Do not use scores. Make exactly one final decision.
                    `,
                },
                {
                    role: "user",
                    content: `
                        Here is the extracted vendor from the invoice:
                        ${JSON.stringify(ex.vendor, null, 2)}
                        ${invoiceId ? `Here is the invoiceId to link: ${invoiceId}` : ''}
                    `,
                },
            ]            
        };

        for await (const evt of agent.streamEvents(input, {version: 'v2'})){
            switch (evt.event) {
                case 'on_tool_end':
                    this.handleTool(evt, invoiceId);
                    break;
            }
        }

        return;
    }

    private getAgent() {
        const tools = this.langchainTools.getTools();

        const model = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
        });

        const agent = createReactAgent({
            llm: model,
            tools
        });

        return agent;
    }

    private getStructuredModel(): any {
        const model = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
            maxRetries: 3,
        });

        const structuredModel = model.withStructuredOutput(invoiceSchema);

        return structuredModel;
    }

    private handleTool(evt: any, invoiceId?: string) {
        const { name, data: { output: { content: output }, input: { input } } } = evt;

        this.pubSub.publish(`llm:${invoiceId}`, {
            llmMessages: {
                kind: 'tool_used',
                text: `Tool ${name} used.`,
                toolName: name,
                invoiceId: invoiceId,
                json: { input, output },
                createdAt: new Date().toISOString(),
            }
        });
    }
}