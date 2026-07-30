"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  TABLE_CLIENT_LIMITS: () => TABLE_CLIENT_LIMITS,
  TABLE_ERROR_CODES: () => TABLE_ERROR_CODES,
  TableClient: () => TableClient,
  TableServiceError: () => TableServiceError,
  mapStatusToDefaultCode: () => mapStatusToDefaultCode,
  normalizeErrorCode: () => normalizeErrorCode
});
module.exports = __toCommonJS(index_exports);

// src/errors.ts
var TABLE_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "DATASET_NOT_FOUND",
  "ROW_NOT_FOUND",
  "VALIDATION_ERROR",
  "SORT_NOT_PUSHED_DOWN",
  "FILTER_NOT_PUSHED_DOWN",
  "WRITE_NOT_SUPPORTED",
  "UNSUPPORTED_HYBRID",
  "SOURCE_RATE_LIMITED",
  "SOURCE_TIMEOUT",
  "AUTHORIZATION_UNAVAILABLE",
  "INVALID_RESPONSE",
  "RESPONSE_TOO_LARGE",
  "SYNC_IN_PROGRESS",
  "INTERNAL_ERROR"
];
var TableServiceError = class extends Error {
  static {
    __name(this, "TableServiceError");
  }
  code;
  statusCode;
  requestId;
  correlationURL;
  constructor(input) {
    super(input.message);
    this.name = "TableServiceError";
    this.code = normalizeErrorCode(input.code);
    this.statusCode = input.statusCode;
    this.requestId = input.requestId;
    this.correlationURL = input.correlationURL;
  }
};
function normalizeErrorCode(code) {
  return code.trim().replace(/[-\s]+/g, "_").toUpperCase();
}
__name(normalizeErrorCode, "normalizeErrorCode");
function mapStatusToDefaultCode(status) {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "DATASET_NOT_FOUND";
    case 400:
      return "VALIDATION_ERROR";
    case 409:
      return "SYNC_IN_PROGRESS";
    case 422:
      return "WRITE_NOT_SUPPORTED";
    case 429:
      return "SOURCE_RATE_LIMITED";
    case 504:
      return "SOURCE_TIMEOUT";
    case 503:
      return "AUTHORIZATION_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}
__name(mapStatusToDefaultCode, "mapStatusToDefaultCode");

// src/client.ts
var TABLE_CLIENT_LIMITS = {
  defaultMaxResponseBytes: 2 * 1024 * 1024,
  hardMaxResponseBytes: 10 * 1024 * 1024,
  defaultMaxPageSize: 100,
  hardMaxPageSize: 200,
  defaultMaxPages: 20,
  hardMaxPages: 100,
  defaultMaxRows: 1e3,
  hardMaxRows: 1e4
};
var TableClient = class {
  static {
    __name(this, "TableClient");
  }
  baseUrl;
  getToken;
  fetchImpl;
  timeoutMs;
  maxResponseBytes;
  maxPageSize;
  constructor(config) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.getToken = config.getToken;
    this.fetchImpl = config.fetch ?? fetch;
    this.timeoutMs = boundedInteger(config.timeoutMs ?? 25e3, 1, 3e5, "timeoutMs");
    this.maxResponseBytes = boundedInteger(config.maxResponseBytes ?? TABLE_CLIENT_LIMITS.defaultMaxResponseBytes, 1, TABLE_CLIENT_LIMITS.hardMaxResponseBytes, "maxResponseBytes");
    this.maxPageSize = boundedInteger(config.maxPageSize ?? TABLE_CLIENT_LIMITS.defaultMaxPageSize, 1, TABLE_CLIENT_LIMITS.hardMaxPageSize, "maxPageSize");
  }
  listDatasets() {
    return this.request("GET", "/api/v2/tables");
  }
  getDataset(datasetId) {
    return this.request("GET", `/api/v2/tables/${encodeURIComponent(datasetId)}`);
  }
  getLayout(datasetId, options) {
    const params = new URLSearchParams();
    if (options?.viewId) params.set("viewId", options.viewId);
    if (options?.filter) params.set("filter", JSON.stringify(options.filter));
    if (options?.includeArchived) params.set("includeArchived", "true");
    const qs = params.toString();
    const path = `/api/v2/tables/${encodeURIComponent(datasetId)}/layout${qs ? `?${qs}` : ""}`;
    return this.request("GET", path);
  }
  queryRows(datasetId, body) {
    const boundedBody = {
      ...body,
      ...body.limit === void 0 ? {} : {
        limit: Math.min(positiveInteger(body.limit, "limit"), this.maxPageSize)
      }
    };
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/query`, boundedBody);
  }
  async *iterateRows(datasetId, query = {}, options = {}) {
    const maxPages = boundedInteger(options.maxPages ?? TABLE_CLIENT_LIMITS.defaultMaxPages, 1, TABLE_CLIENT_LIMITS.hardMaxPages, "maxPages");
    const maxRows = boundedInteger(options.maxRows ?? TABLE_CLIENT_LIMITS.defaultMaxRows, 1, TABLE_CLIENT_LIMITS.hardMaxRows, "maxRows");
    const pageSize = Math.min(positiveInteger(options.pageSize ?? query.limit ?? TABLE_CLIENT_LIMITS.defaultMaxPageSize, "pageSize"), this.maxPageSize, maxRows);
    let cursor = query.cursor?.trim() || void 0;
    let yielded = 0;
    const seenCursors = new Set(cursor ? [
      cursor
    ] : []);
    for (let pageNumber = 0; pageNumber < maxPages && yielded < maxRows; pageNumber += 1) {
      const page = await this.queryRows(datasetId, {
        ...query,
        cursor,
        limit: Math.min(pageSize, maxRows - yielded)
      });
      if (!Array.isArray(page.rows)) {
        throw invalidResponse("Table query response is missing rows");
      }
      for (const row of page.rows) {
        if (yielded >= maxRows) return;
        yielded += 1;
        yield row;
      }
      const nextCursor = page.nextCursor?.trim();
      if (!nextCursor) return;
      if (nextCursor === cursor || seenCursors.has(nextCursor)) {
        throw invalidResponse("Table query returned a repeated cursor");
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
  }
  insertRow(datasetId, body, context) {
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows`, body, mutationHeaders(context));
  }
  importRows(datasetId, body) {
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/import`, body);
  }
  patchRow(datasetId, rowId, body, context) {
    return this.request("PATCH", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/${encodeURIComponent(rowId)}`, body, mutationHeaders(context));
  }
  getRow(datasetId, rowId) {
    return this.request("GET", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/${encodeURIComponent(rowId)}`);
  }
  moveRows(datasetId, body, context) {
    return this.request("PATCH", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/move`, body, mutationHeaders(context));
  }
  deleteRow(datasetId, rowId, context) {
    return this.request("DELETE", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/${encodeURIComponent(rowId)}`, void 0, mutationHeaders(context));
  }
  triggerSync(datasetId) {
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/sync`);
  }
  patchMetadata(datasetId, body) {
    return this.request("PATCH", `/api/v2/tables/${encodeURIComponent(datasetId)}/metadata`, body);
  }
  attachRowFile(datasetId, rowId, body) {
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/rows/${encodeURIComponent(rowId)}/files`, body);
  }
  purgeColumns(datasetId, body) {
    return this.request("POST", `/api/v2/tables/${encodeURIComponent(datasetId)}/metadata/purge-columns`, body);
  }
  async request(method, path, body, additionalHeaders = {}) {
    try {
      const providedToken = await this.getToken();
      if (typeof providedToken !== "string" || !providedToken.trim()) {
        throw new TableServiceError({
          code: "UNAUTHORIZED",
          message: "Table credential provider returned an empty token",
          statusCode: 401,
          requestId: ""
        });
      }
      const token = providedToken.trim();
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...additionalHeaders
      };
      const init = {
        method,
        headers,
        signal: AbortSignal.timeout(this.timeoutMs)
      };
      if (body !== void 0) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, init).catch((error) => {
        const name = error instanceof Error ? error.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new TableServiceError({
            code: "SOURCE_TIMEOUT",
            message: "Table service request timed out",
            statusCode: 504,
            requestId: ""
          });
        }
        const message = error instanceof Error ? error.message : "Table edge request failed";
        throw new TableServiceError({
          code: "INTERNAL_ERROR",
          message,
          statusCode: 502,
          requestId: ""
        });
      });
      const text = await readBoundedResponse(response, this.maxResponseBytes);
      let parsedPayload;
      try {
        parsedPayload = JSON.parse(text);
      } catch {
        if (response.ok) {
          throw invalidResponse("Table service returned a success response that is not valid JSON");
        }
        throw new TableServiceError({
          code: mapStatusToDefaultCode(response.status),
          message: text.trim() || response.statusText || "Unexpected response from table service",
          statusCode: response.status,
          requestId: ""
        });
      }
      if (!isRecord(parsedPayload)) {
        if (response.ok) {
          throw invalidResponse("Table service returned a malformed success envelope");
        }
        throw new TableServiceError({
          code: mapStatusToDefaultCode(response.status),
          message: response.statusText || "Unexpected response from table service",
          statusCode: response.status,
          requestId: ""
        });
      }
      const payload = parsedPayload;
      if (!response.ok || payload.status === "Failure") {
        const failure = payload;
        throw new TableServiceError({
          code: failure.error?.code ?? mapStatusToDefaultCode(response.status),
          message: failure.error?.message ?? response.statusText,
          statusCode: response.status,
          requestId: failure.requestId ?? "",
          correlationURL: failure.error?.correlationURL
        });
      }
      if (payload.status !== "Success" || !("data" in payload)) {
        throw invalidResponse("Table service returned a malformed success envelope");
      }
      return payload.data;
    } catch (error) {
      if (error instanceof TableServiceError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Table edge request failed";
      throw new TableServiceError({
        code: "INTERNAL_ERROR",
        message,
        statusCode: 502,
        requestId: ""
      });
    }
  }
};
function mutationHeaders(context) {
  if (!context) return {};
  const origin = context.origin?.trim();
  const commandId = context.commandId?.trim();
  return {
    ...origin ? {
      "X-Process-Table-Origin": origin
    } : {},
    ...commandId ? {
      "X-Process-Table-Command-Id": commandId
    } : {}
  };
}
__name(mutationHeaders, "mutationHeaders");
function normalizeBaseUrl(baseUrl) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new TypeError("baseUrl must be an absolute HTTP(S) URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("baseUrl must use http or https");
  }
  return normalized;
}
__name(normalizeBaseUrl, "normalizeBaseUrl");
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
__name(isRecord, "isRecord");
function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive integer`);
  }
  return value;
}
__name(positiveInteger, "positiveInteger");
function boundedInteger(value, minimum, maximum, name) {
  const integer = positiveInteger(value, name);
  if (integer < minimum || integer > maximum) {
    throw new TypeError(`${name} must be between ${minimum} and ${maximum}`);
  }
  return integer;
}
__name(boundedInteger, "boundedInteger");
async function readBoundedResponse(response, maxBytes) {
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) {
    throw responseTooLarge(maxBytes);
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw responseTooLarge(maxBytes);
    }
    return text;
  }
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw responseTooLarge(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
__name(readBoundedResponse, "readBoundedResponse");
function invalidResponse(message) {
  return new TableServiceError({
    code: "INVALID_RESPONSE",
    message,
    statusCode: 502,
    requestId: ""
  });
}
__name(invalidResponse, "invalidResponse");
function responseTooLarge(maxBytes) {
  return new TableServiceError({
    code: "RESPONSE_TOO_LARGE",
    message: `Table service response exceeds ${maxBytes} bytes`,
    statusCode: 413,
    requestId: ""
  });
}
__name(responseTooLarge, "responseTooLarge");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TABLE_CLIENT_LIMITS,
  TABLE_ERROR_CODES,
  TableClient,
  TableServiceError,
  mapStatusToDefaultCode,
  normalizeErrorCode
});
//# sourceMappingURL=index.cjs.map