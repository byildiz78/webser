export type ApiResponse<T> = {
    data?: T[];
    error?: string;
    affectedRows?: number;
    queryTime?: number;
    totalRows?: number;
}

export type WebserviceLogs = {
    endpoint: string;
    apiKey: string;
    databaseId: string;
    method: string;
    requestBody?: any;
    responseBody?: any;
    responseTimeMs: number;
    statusCode: number;
    errorMessage?: string;
    clientIp?: string;
    jobId?: string;
    jobStatus?: string;
    jobDownloadLink?: string;
    queryText?: string;
    affectedRows?: number;
    userAgent?: string | null;
}

export type WebserviceLogsCalculated = {
    total_queries: number;
    avg_time: number;
    max_time: number;
}