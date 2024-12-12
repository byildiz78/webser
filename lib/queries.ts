export const Q_CREATE_WEBSERVICELOG_TABLE = `
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'webservice_logs')
BEGIN
    CREATE TABLE webservice_logs (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        request_timestamp DATETIME2 DEFAULT GETDATE(),
        endpoint NVARCHAR(255),
        api_key NVARCHAR(255),
        request_method NVARCHAR(10),
        request_body NVARCHAR(MAX),
        response_body NVARCHAR(MAX),
        response_time_ms INT,
        status_code INT,
        error_message NVARCHAR(MAX),
        client_ip NVARCHAR(50),
        job_id NVARCHAR(36),
        job_status NVARCHAR(20),
        job_download_link NVARCHAR(255),
        query_text NVARCHAR(MAX),
        affected_rows INT,
        user_agent NVARCHAR(500)
    );

    CREATE INDEX idx_request_timestamp ON webservice_logs(request_timestamp);
    CREATE INDEX idx_endpoint ON webservice_logs(endpoint);
    CREATE INDEX idx_api_key ON webservice_logs(api_key);
    CREATE INDEX idx_status_code ON webservice_logs(status_code);
    CREATE INDEX idx_job_id ON webservice_logs(job_id);
END
`;


export const Q_INSERT_WEBSERVICELOG_TABLE = `INSERT INTO webservice_logs (
            endpoint,
            api_key,
            request_method,
            request_body,
            response_body,
            response_time_ms,
            status_code,
            error_message,
            client_ip,
            job_id,
            job_status,
            job_download_link,
            query_text,
            affected_rows,
            user_agent
        ) VALUES (
            @endpoint,
            @apiKey,
            @method,
            @requestBody,
            @responseBody,
            @responseTimeMs,
            @statusCode,
            @errorMessage,
            @clientIp,
            @jobId,
            @jobStatus,
            @jobDownloadLink,
            @queryText,
            @affectedRows,
            @userAgent
        )`