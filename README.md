<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="92" alt="NestJS" />
</p>

# Invoice Analyzer (NestJS + GraphQL + LangChain)

Extract structured data from invoice PDFs and automatically match or create vendors using an AI agent powered by LangChain and Google Vertex AI (Gemini). Files are uploaded via GraphQL, processed asynchronously with BullMQ, and results are stored in Postgres.

> Demo: you can check a demo video [here](https://youtu.be/Grt4E5qfWRI)

If the video doesn't render in your viewer, download/play it directly: `./demo_video.mov`.

## What this app does

- Accepts an invoice PDF through a GraphQL mutation (`analyzeInvoice`).
- Saves the file to `uploads/` and creates an `Invoice` record with status `processing`.
- Enqueues a background job (BullMQ/Redis) to analyze the PDF with Google Vertex AI (Gemini 2.5 Flash) using LangChain.
- Extracts a structured JSON payload (invoice number, totals, vendor/customer info, dates, etc.).
- Uses a LangGraph agent with tools to decide whether to link to an existing vendor or create a new one:
  - `similar_vendors` (search by name)
  - `create_vendor`
  - `link_vendor`
- Updates the `Invoice` with status `processed` and stores the extracted JSON in `data` (exposed as `parsedData`).

## Tech stack

- NestJS 11, GraphQL (Apollo Driver)
- File uploads: `graphql-upload`
- Background jobs: BullMQ + Redis
- Database: Postgres + TypeORM
- AI: LangChain, LangGraph, Google Vertex AI (Gemini 2.5 Flash)

## Architecture overview

1) Client calls `analyzeInvoice(file: Upload!)`.
2) The server persists the file and creates an `Invoice` row with `status=processing`.
3) A BullMQ worker (`InvoiceProcessor`) picks up the job and calls `LangchainService.analyzeDocument`.
4) Gemini extracts structured fields defined by a Zod schema.
5) An agent runs tools to match/create a `Vendor` and link it to the invoice.
6) The invoice is updated to `processed` with `data` set to the JSON extraction.

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- Redis running locally on `localhost:6379`
  - macOS: `brew install redis && brew services start redis`
- Postgres running locally on `localhost:5432`
  - Database: `langchain_analyzer`
  - User: `postgres`, Password: `postgres`
- Google Cloud service account with access to Vertex AI
  - Set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your JSON key (e.g., `cloud_storage_key.json`).

Notes:
- Connection settings for Redis and Postgres are currently hard-coded in `src/app.module.ts`. Adjust them there if your environment differs.
- The upload size limit is 50 MB (configured in `src/main.ts`).

## Setup

1) Install dependencies

```bash
npm install
```

2) Ensure Redis is running

```bash
# macOS (Homebrew)
brew services start redis
```

3) Ensure Postgres is running and the database exists

```bash
# Create DB (adjust if needed)
createdb langchain_analyzer || true
```

4) Set Google credentials environment variable

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/cloud_storage_key.json"
```

5) Start the server

```bash
# development
npm run start

# or watch mode
npm run start:dev
```

The GraphQL endpoint will be available at:

- http://localhost:3000/graphql

> CORS is enabled for `*` by default (see `src/main.ts`).

## GraphQL API

### Types

- `Invoice` fields: `id`, `filename`, `status`, `data` (raw JSON string), `parsedData` (JSON object), `vendor`, timestamps.
- `Vendor` fields: `id`, `displayName`, `taxId`, `iban`, `email`, `phone`, `address`.

### Queries

Get a single invoice by id:

```graphql
query GetInvoice($id: String!) {
  getInvoice(id: $id) {
    id
    filename
    status
    parsedData
    vendor {
      id
      displayName
    }
  }
}
```

List vendors:

```graphql
query Vendors {
  getVendors {
    id
    displayName
    email
  }
}
```

### Mutations

Upload and analyze an invoice PDF (GraphQL multipart request):

Response example (initial):

```json
{
  "data": {
    "analyzeInvoice": {
      "id": 1,
      "status": "processing",
      "filename": "invoice.pdf"
    }
  }
}
```

Then poll `getInvoice(id)` until `status` becomes `processed` (or `failed`). When processed, `parsedData` will contain the extracted JSON, and `vendor` may be linked based on the agent's decision.

## Background processing and AI agent

- Queue: `invoice` (BullMQ)
- Worker: `InvoiceProcessor` (`src/invoice/invoice.processor.ts`)
- Extraction: `LangchainService.analyzeDocument` calls Vertex AI (Gemini 2.5 Flash) with a Zod-enforced structured output schema.
- Vendor decision: `LangchainService.matchOrcreateVendor` runs a LangGraph ReAct agent with tools from `LangchainTools`:
  - `similar_vendors(name)` — searches existing vendors by name
  - `create_vendor({ displayName, taxId, email, phone, address, iban })` — creates a vendor
  - `link_vendor({ vendorId, invoiceId })` — links a vendor to the invoice

Decision policy (simplified):

1) Try to find a matching vendor by email or normalized name; if found, link it.
2) Otherwise, create a new vendor using only visible fields.
