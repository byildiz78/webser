import { Database } from "./database";
import { Q_INSERT_WEBSERVICELOG_TABLE } from "./queries";


/*
export async function initializeLogTable() {
    try {
        await executeQuery(Q_CREATE_WEBSERVICELOG_TABLE);
    } catch (error) {
        console.error('Error Creating Log Table', error);
        throw error;
    }
}
*/

export async function logApiRequest({
    endpoint,
    apiKey,
    databaseId,
    method,
    requestBody,
    responseBody,
    responseTimeMs,
    statusCode,
    errorMessage,
    clientIp,
    jobId,
    jobStatus,
    jobDownloadLink,
    queryText,
    affectedRows,
    userAgent
}: {
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
}) {
    try {
        const params = {
            endpoint,
            apiKey,
            method,
            requestBody: requestBody ? JSON.stringify(requestBody) : null,
            responseBody: responseBody ? JSON.stringify(responseBody) : null,
            responseTimeMs,
            statusCode,
            errorMessage: errorMessage || null,
            clientIp: clientIp || null,
            jobId: jobId || null,
            jobStatus: jobStatus || null,
            jobDownloadLink: jobDownloadLink || null,
            queryText: queryText || null,
            affectedRows: affectedRows || null,
            userAgent: userAgent || null
        };
        const database = new Database();

        await database.query(Q_INSERT_WEBSERVICELOG_TABLE, databaseId, apiKey, params);
    } catch (error) {
        console.error('Error logging API request:', error);
    }
}
