type StorageMode = 'owned' | 'replica' | 'passthrough' | 'hybrid' | 'observe' | 'workflow-context';
type SyncStatus = 'idle' | 'running' | 'error';
type SyncMeta = {
    stale?: boolean;
    lastSyncedAt?: string;
    status?: SyncStatus;
    invalidationReason?: string;
};
type TableColumns = Record<string, unknown>;
type CanonicalRow<TColumns extends TableColumns = TableColumns> = {
    rowId: string;
    datasetId: string;
    parentRowId?: string;
    groupId?: string;
    rank?: string;
    value?: string;
    columns?: TColumns;
    createdAt: string;
    updatedAt: string;
    userId?: string;
    sync?: SyncMeta;
};
type Capabilities = {
    pushdownFilter?: 'none' | 'partial' | 'full';
    pushdownSort?: 'none' | 'partial' | 'full';
    pushdownPage?: 'none' | 'partial' | 'full';
    filterFields?: string[];
    filterOperators?: QueryFilterOperator[];
    sortFields?: string[];
    sortColumnFields?: boolean;
    sortNulls?: 'natural' | 'explicit';
    write?: boolean;
    sync?: boolean;
    maxPageSize?: number;
};
type DatasetBinding = {
    datasetId: string;
    storageMode: StorageMode;
    sourceType?: string;
    schemaVersion?: number;
    syncPolicy?: {
        staleThresholdSec?: number;
        conflictPolicy?: string;
    };
};
type DatasetResponse = {
    datasetId: string;
    storageMode: StorageMode;
    capabilities: Capabilities;
    binding: DatasetBinding;
    sync?: SyncMeta;
};
type DatasetDiscoveryItem = {
    datasetId: string;
    name: string;
    project: {
        id: string;
        name: string;
    };
    storageMode: StorageMode;
    sourceType: string;
    schemaVersion: number;
    updatedAt: string;
    capabilities: {
        read: boolean;
        write: boolean;
        sync: boolean;
    };
};
type DatasetDiscoveryResponse = {
    v: 1;
    datasets: DatasetDiscoveryItem[];
};
type GroupCount = {
    groupId: string;
    count: number;
};
type MetadataOption = {
    id?: string;
    value: string;
    label?: string;
    groupId?: string;
};
type FileBinding = {
    cardinality?: 'one' | 'many';
    accept?: string[];
    role?: string;
};
type MetadataColumn = {
    id: string;
    name: string;
    typeOf: string;
    key?: boolean;
    itemId?: boolean;
    itemName?: boolean;
    computedExpr?: string;
    fileBinding?: FileBinding;
    pos: number;
    status?: 'active' | 'archived';
    archivedAt?: string;
    options?: MetadataOption[];
};
type MetadataSubitemProjection = {
    sourceColumnId: string;
    pos: number;
    width?: number;
};
type MetadataSubitemColumn = MetadataColumn | MetadataSubitemProjection;
type MetadataGroup = {
    id: string;
    name: string;
    color?: string;
    pos: number;
    default?: boolean;
};
type MetadataViewFilter = {
    columnId: string;
    operator: 'eq' | 'neq' | 'contains' | 'empty' | 'notEmpty';
    value?: string;
};
type MetadataViewSort = {
    columnId: string;
    direction: 'asc' | 'desc';
};
type MetadataView = {
    id: string;
    name: string;
    filters?: MetadataViewFilter[];
    sort?: MetadataViewSort[];
    hiddenColumnIds?: string[];
    columnWidths?: Record<string, number>;
    parentColumns?: MetadataViewColumnPlane;
    subitemColumns?: MetadataViewColumnPlane;
};
type MetadataViewColumnPlane = {
    columnOrder?: string[];
    hiddenColumnIds?: string[];
    columnWidths?: Record<string, number>;
    freezeColumns?: number;
};
type TableMutationContext = {
    origin?: 'user' | 'agent' | 'system';
    commandId?: string;
    expectedRevision?: string;
};
type TableRowMutationContext = {
    origin?: 'agent';
    commandId?: string;
};
type MetadataCapabilities = {
    itemEnvelope?: boolean;
    activityLog?: boolean;
    fileAttachments?: boolean;
    savedViews?: boolean;
    subitems?: boolean;
    itemTerminology?: string;
    itemHeight?: 'single' | 'double' | 'triple';
};
type RowHints = {
    updateCount?: number;
    fileCount?: number;
    subitemCount?: number;
    lastActivityAt?: string;
};
type ActivityLogEntry = {
    entryId: string;
    rowId: string;
    kind?: string;
    userId?: string;
    entryDate?: string;
    body?: Record<string, unknown>;
    fieldChange?: Record<string, unknown>;
};
type RowAttachmentRef = {
    fileId: string;
    filename?: string;
    mime?: string;
};
type LayoutRow<TColumns extends TableColumns = TableColumns> = CanonicalRow<TColumns> & {
    hints?: RowHints;
};
type RowDetailResponse<TColumns extends TableColumns = TableColumns> = {
    row: CanonicalRow<TColumns>;
    hints?: RowHints;
    activity?: ActivityLogEntry[];
    attachments?: RowAttachmentRef[];
};
type LayoutResponse<TColumns extends TableColumns = TableColumns> = {
    datasetId: string;
    storageMode: StorageMode;
    groups?: GroupCount[];
    rows?: Array<LayoutRow<TColumns>>;
    nextCursor?: string;
    sync?: SyncMeta;
    schemaVersion?: number;
    columns?: MetadataColumn[];
    subitemColumns?: MetadataColumn[];
    structureGroups?: MetadataGroup[];
    primaryGroupingColumnId?: string;
    views?: MetadataView[];
    capabilities?: MetadataCapabilities;
};
type PatchMetadataRequest = {
    columns?: MetadataColumn[];
    subitemColumns?: MetadataSubitemColumn[];
    structureGroups?: MetadataGroup[];
    primaryGroupingColumnId?: string;
    clearPrimaryGroupingColumnId?: boolean;
    capabilities?: MetadataCapabilities;
    views?: MetadataView[];
    context?: TableMutationContext;
};
type MetadataResponse = {
    datasetId: string;
    schemaVersion: number;
    columns: MetadataColumn[];
    subitemColumns?: MetadataSubitemColumn[];
    structureGroups: MetadataGroup[];
    primaryGroupingColumnId?: string;
    capabilities?: MetadataCapabilities;
    views?: MetadataView[];
};
type PurgeColumnsRequest = {
    columnIds: string[];
};
type PurgeColumnsResponse = {
    datasetId: string;
    rowsModified: number;
};
type QueryFilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'empty' | 'notEmpty';
type QueryFilterCondition = {
    field: string;
    operator: QueryFilterOperator;
    value?: unknown;
};
type QueryFilter = {
    conjunction?: 'and' | 'or';
    conditions?: QueryFilterCondition[];
    groups?: QueryFilter[];
};
type QuerySortClause = {
    field: string;
    direction: 1 | -1;
    nulls: 'first' | 'last';
};
type QueryRowsRequest = {
    filter?: QueryFilter;
    sort?: QuerySortClause[];
    cursor?: string;
    limit?: number;
};
type QueryRowsResponse<TColumns extends TableColumns = TableColumns> = {
    rows: Array<CanonicalRow<TColumns>>;
    nextCursor?: string;
    total?: number;
    sync?: SyncMeta;
};
type InsertRowRequest = {
    groupId?: string;
    parentRowId?: string;
    value: string;
    columns?: Record<string, unknown>;
};
type PatchRowRequest = {
    value?: string;
    columns?: Record<string, unknown>;
    groupId?: string;
    rank?: string;
};
type MoveRowsRequest = {
    rowIds: string[];
    targetGroupId?: string;
    targetParentRowId?: string;
    afterRowId?: string;
};
type MoveRowsResponse = {
    rows: CanonicalRow[];
};
type DeleteRowResponse = {
    rowId: string;
    deleted: boolean;
};
type ImportRowsRequest = {
    groupId?: string;
    mapping: Record<string, string>;
    records: Array<Record<string, string>>;
};
type ImportRowsResponse = {
    created: number;
    updated: number;
    rows?: CanonicalRow[];
};
type TriggerSyncResponse = {
    datasetId: string;
    status: SyncStatus;
    rowsRead?: number;
    rowsWritten?: number;
};
type AttachRowFileRequest = {
    fileId: string;
    filename?: string;
    mime?: string;
    columnId?: string;
};
type AttachRowFileResponse = {
    attachment: RowAttachmentRef;
    row?: CanonicalRow;
};
type EnvelopeSuccess<T> = {
    status: 'Success';
    requestId: string;
    requestTime: string;
    data: T;
};
type EnvelopeFailure = {
    status: 'Failure';
    requestId: string;
    requestTime: string;
    error: {
        code: string;
        message: string;
        correlationURL?: string;
    };
};
type TableClientConfig = {
    baseUrl: string;
    getToken: () => Promise<string> | string;
    fetch?: typeof fetch;
    timeoutMs?: number;
    maxResponseBytes?: number;
    maxPageSize?: number;
};
type RowIterationOptions = {
    pageSize?: number;
    maxPages?: number;
    maxRows?: number;
};

declare const TABLE_CLIENT_LIMITS: {
    readonly defaultMaxResponseBytes: number;
    readonly hardMaxResponseBytes: number;
    readonly defaultMaxPageSize: 100;
    readonly hardMaxPageSize: 200;
    readonly defaultMaxPages: 20;
    readonly hardMaxPages: 100;
    readonly defaultMaxRows: 1000;
    readonly hardMaxRows: 10000;
};
declare class TableClient {
    private readonly baseUrl;
    private readonly getToken;
    private readonly fetchImpl;
    private readonly timeoutMs;
    private readonly maxResponseBytes;
    private readonly maxPageSize;
    constructor(config: TableClientConfig);
    listDatasets(): Promise<DatasetDiscoveryResponse>;
    getDataset(datasetId: string): Promise<DatasetResponse>;
    getLayout<TColumns extends TableColumns = TableColumns>(datasetId: string, options?: {
        viewId?: string;
        filter?: Record<string, unknown>;
        includeArchived?: boolean;
    }): Promise<LayoutResponse<TColumns>>;
    queryRows<TColumns extends TableColumns = TableColumns>(datasetId: string, body: QueryRowsRequest): Promise<QueryRowsResponse<TColumns>>;
    iterateRows<TColumns extends TableColumns = TableColumns>(datasetId: string, query?: Omit<QueryRowsRequest, 'cursor' | 'limit'> & {
        cursor?: string;
        limit?: number;
    }, options?: RowIterationOptions): AsyncGenerator<CanonicalRow<TColumns>, void, undefined>;
    insertRow<TColumns extends TableColumns = TableColumns>(datasetId: string, body: InsertRowRequest, context?: TableRowMutationContext): Promise<CanonicalRow<TColumns>>;
    importRows(datasetId: string, body: ImportRowsRequest): Promise<ImportRowsResponse>;
    patchRow<TColumns extends TableColumns = TableColumns>(datasetId: string, rowId: string, body: PatchRowRequest, context?: TableRowMutationContext): Promise<CanonicalRow<TColumns>>;
    getRow<TColumns extends TableColumns = TableColumns>(datasetId: string, rowId: string): Promise<RowDetailResponse<TColumns>>;
    moveRows(datasetId: string, body: MoveRowsRequest, context?: TableRowMutationContext): Promise<MoveRowsResponse>;
    deleteRow(datasetId: string, rowId: string, context?: TableRowMutationContext): Promise<DeleteRowResponse>;
    triggerSync(datasetId: string): Promise<TriggerSyncResponse>;
    patchMetadata(datasetId: string, body: PatchMetadataRequest): Promise<MetadataResponse>;
    attachRowFile(datasetId: string, rowId: string, body: AttachRowFileRequest): Promise<AttachRowFileResponse>;
    purgeColumns(datasetId: string, body: PurgeColumnsRequest): Promise<PurgeColumnsResponse>;
    private request;
}

declare const TABLE_ERROR_CODES: readonly ["UNAUTHORIZED", "FORBIDDEN", "DATASET_NOT_FOUND", "ROW_NOT_FOUND", "VALIDATION_ERROR", "SORT_NOT_PUSHED_DOWN", "FILTER_NOT_PUSHED_DOWN", "WRITE_NOT_SUPPORTED", "UNSUPPORTED_HYBRID", "SOURCE_RATE_LIMITED", "SOURCE_TIMEOUT", "AUTHORIZATION_UNAVAILABLE", "INVALID_RESPONSE", "RESPONSE_TOO_LARGE", "SYNC_IN_PROGRESS", "INTERNAL_ERROR"];
type TableErrorCode = (typeof TABLE_ERROR_CODES)[number];
declare class TableServiceError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly requestId: string;
    readonly correlationURL?: string;
    constructor(input: {
        code: string;
        message: string;
        statusCode: number;
        requestId: string;
        correlationURL?: string;
    });
}
declare function normalizeErrorCode(code: string): string;
declare function mapStatusToDefaultCode(status: number): TableErrorCode;

export { type ActivityLogEntry, type AttachRowFileRequest, type AttachRowFileResponse, type CanonicalRow, type Capabilities, type DatasetBinding, type DatasetDiscoveryItem, type DatasetDiscoveryResponse, type DatasetResponse, type DeleteRowResponse, type EnvelopeFailure, type EnvelopeSuccess, type FileBinding, type GroupCount, type ImportRowsRequest, type ImportRowsResponse, type InsertRowRequest, type LayoutResponse, type LayoutRow, type MetadataCapabilities, type MetadataColumn, type MetadataGroup, type MetadataOption, type MetadataResponse, type MetadataSubitemColumn, type MetadataSubitemProjection, type MetadataView, type MetadataViewColumnPlane, type MetadataViewFilter, type MetadataViewSort, type MoveRowsRequest, type MoveRowsResponse, type PatchMetadataRequest, type PatchRowRequest, type PurgeColumnsRequest, type PurgeColumnsResponse, type QueryFilter, type QueryFilterCondition, type QueryFilterOperator, type QueryRowsRequest, type QueryRowsResponse, type QuerySortClause, type RowAttachmentRef, type RowDetailResponse, type RowHints, type RowIterationOptions, type StorageMode, type SyncMeta, type SyncStatus, TABLE_CLIENT_LIMITS, TABLE_ERROR_CODES, TableClient, type TableClientConfig, type TableColumns, type TableErrorCode, type TableMutationContext, type TableRowMutationContext, TableServiceError, type TriggerSyncResponse, mapStatusToDefaultCode, normalizeErrorCode };
