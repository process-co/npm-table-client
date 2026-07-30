# @process.co/table-client

Framework-neutral TypeScript client for the Process Table v2 API. It supports
Node.js and Vercel server runtimes with dual ESM/CommonJS exports and no runtime
dependencies.

## Install

```bash
npm install @process.co/table-client
```

## Server-side usage

Create a scoped `pct_` Table principal in Process and store its secret in the
deployment environment. Inject the credential provider; the SDK never reads
browser storage or environment variables itself.

```typescript
import {
  TableClient,
  TableServiceError,
} from '@process.co/table-client';

const client = new TableClient({
  baseUrl: process.env.PROCESS_TABLE_BASE_URL!,
  getToken: () => process.env.PROCESS_TABLE_TOKEN!,
});

const discovery = await client.listDatasets();
const dataset = discovery.datasets.find((item) => item.name === 'Orders');

if (!dataset) throw new Error('Orders dataset is not available');

const page = await client.queryRows(dataset.datasetId, {
  limit: 50,
  sort: [{ field: 'rank', direction: 1, nulls: 'last' }],
});
```

Never use a `pct_` credential in a browser bundle, model prompt, tool input
schema, log field, or client-readable environment variable. Rotate or revoke a
credential if it may have been exposed.

## Bounded cursor iteration

`iterateRows` is an async iterator with explicit page and total-row limits. The
SDK also clamps each request to its configured page cap.

```typescript
for await (const row of client.iterateRows(
  dataset.datasetId,
  {
    filter: {
      conditions: [
        { field: 'columns.status', operator: 'eq', value: 'open' },
      ],
    },
  },
  {
    pageSize: 50,
    maxPages: 10,
    maxRows: 500,
  },
)) {
  console.log(row.rowId, row.columns);
}
```

Defaults are 100 rows per request, 20 pages, 1,000 yielded rows, and a 2 MiB
response cap. Constructor options may lower or raise those values only within
the exported `TABLE_CLIENT_LIMITS` hard caps.

## Errors

Failures throw `TableServiceError` and preserve the normalized Process error
code, HTTP status, request id, and optional correlation URL.

```typescript
try {
  await client.getRow(dataset.datasetId, 'missing-row');
} catch (error) {
  if (error instanceof TableServiceError) {
    console.error(error.code, error.statusCode, error.requestId);
  }
}
```

Malformed envelopes, repeated cursors, timeouts, and oversized responses also
fail deterministically.

## Agent mutation attribution

Trusted server adapters may attach mutation context without placing it in the
row body or a model-visible schema:

```typescript
await client.insertRow(
  dataset.datasetId,
  { value: 'Review order' },
  { origin: 'agent', commandId: 'ai:tool-call-42' },
);
```

Edge accepts `origin: agent` only for authenticated external Table principals.
The command id is recorded on row events and makes identical agent insert
retries converge on the same row id.

## Development validation

```bash
pnpm --filter @process.co/table-client openapi:check
pnpm --filter @process.co/table-client test --runInBand
pnpm --filter @process.co/table-client test:packed
```

`test:packed` builds `npm pack` output, installs it into a temporary project
outside the workspace, imports both module formats, and runs against a fixture
HTTP server.

Validated builds are hoisted from the monorepo to
[`process-co/npm-table-client`](https://github.com/process-co/npm-table-client).
GitHub releases in that distribution repository publish npm versions and verify
ESM/CommonJS installation from the public registry. The client distribution is
synchronized before `@process.co/table-ai-sdk`.
