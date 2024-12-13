export interface QueryResult {
    [key: string]: any;
}

export interface JobResult {
    success: boolean;
    processedAt: Date;
    result?: QueryResult[];
    error?: string;
    metadata: {
        rowCount?: number;
        query: string;
        executionTime?: number;
        jobId: string;
        errorDetails?: string;
    };
}

export interface  JobData {
    query: string;
    parameters?: any[];
    requestInfo: {
      apiKey: string;
      databaseId: string;
      clientIp?: string;
      userAgent?: string;
      timestamp: Date;
    };
  }
  