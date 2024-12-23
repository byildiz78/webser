import QueueConfig, { QueueType } from './config';
import {Database} from '@/lib/database';
import { JobsOptions } from 'bullmq';

interface BigQueryJobData {
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

interface QueryResult {
  [key: string]: any;
}

// BigQuery işlerini işleyen worker
const bigqueryProcessor = async (job: any) => {
  const { data } = job;
  
  try {
    console.log(`Processing BigQuery job ${job.id}: ${data.query}`);
    
    const startTime = Date.now();
    
    // Execute the query and get results
    const database = new Database();
    const queryResult = await database.query<QueryResult[]>(data.query, data.requestInfo.databaseId, data.requestInfo.apiKey, data.parameters);
    console.log("queryResult", queryResult)
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`Query execution completed for job ${job.id}. Found ${queryResult?.totalRows || 0} rows.`);

    // Return both metadata and results
    const result = {
      success: true,
      processedAt: new Date(),
      result: queryResult, // The actual query results
      metadata: {
        rowCount: Array.isArray(queryResult) ? queryResult.length : 0,
        query: data.query,
        executionTime,
        jobId: job.id
      }
    };

    console.log(`Returning result for job ${job.id}`);
    return result;

  } catch (error: any) {
    console.error(`Error processing BigQuery job ${job.id}:`, error);
    
    // Return error result
    return {
      success: false,
      processedAt: new Date(),
      error: error.message,
      metadata: {
        query: data.query,
        jobId: job.id,
        errorDetails: error.stack
      }
    };
  }
};

// BigQuery queue'sunu ve worker'ını oluştur
const bigqueryQueue = QueueConfig.getQueue(QueueType.BIGQUERY);

// Worker'ı oluştur ve event listener'ları ekle
const bigqueryWorker = QueueConfig.createWorker(QueueType.BIGQUERY, bigqueryProcessor);

bigqueryWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

bigqueryWorker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

// BigQuery işi ekleme fonksiyonu
export const addBigQueryJob = async (data: BigQueryJobData) => {
  const jobOptions: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // 7 gün sonra tamamlanan işleri sil
      count: 10000 // En fazla 10000 tamamlanan iş tut
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7 gün sonra başarısız işleri sil
    }
  };

  return await bigqueryQueue.add('process-query', data, jobOptions);
};

export default bigqueryQueue;
