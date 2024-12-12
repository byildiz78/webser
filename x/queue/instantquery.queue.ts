import QueueConfig, { QueueType } from './config';
import { executeQuery } from '@/x/db';
import { JobsOptions } from 'bullmq';

interface InstantQueryJobData {
  query: string;
  parameters?: any[];
  requestInfo: {
    apiKey: string;
    clientIp?: string;
    userAgent?: string;
    timestamp: Date;
  };
}

interface QueryResult {
  [key: string]: any;
}

// Instant Query işlerini işleyen worker
const instantQueryProcessor = async (job: any) => {
  const { data } = job;
  
  try {
    console.log(`Processing Instant Query: ${data.query}`);
    
    const startTime = Date.now();
    
    // Execute the query and get results
    const queryResult = await executeQuery<QueryResult[]>(data.query);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`Query execution completed. Found ${queryResult?.length || 0} rows.`);

    // Return both metadata and results
    return {
      success: true,
      processedAt: new Date(),
      result: queryResult,
      metadata: {
        rowCount: Array.isArray(queryResult) ? queryResult.length : 0,
        query: data.query,
        executionTime
      }
    };

  } catch (error: any) {
    console.error('Error processing Instant Query:', error);
    
    // Return error result
    return {
      success: false,
      processedAt: new Date(),
      error: error.message,
      metadata: {
        query: data.query,
        errorDetails: error.stack
      }
    };
  }
};

// Instant Query queue'sunu ve worker'ını oluştur
export const instantQueryQueue = QueueConfig.getQueue(QueueType.INSTANT_QUERY);

// Worker'ı oluştur ve event listener'ları ekle
const instantQueryWorker = QueueConfig.createWorker(QueueType.INSTANT_QUERY, instantQueryProcessor);

instantQueryWorker.on('completed', (job) => {
  console.log(`Instant Query completed successfully: ${job.id}`);
});

instantQueryWorker.on('failed', (job, error) => {
  console.error(`Instant Query failed: ${job?.id}`, error);
});

// Instant Query işi ekleme ve sonuç bekleme fonksiyonu
export const processInstantQuery = async (data: InstantQueryJobData) => {
  console.log('Processing new Instant Query');
  
  const jobOptions: JobsOptions = {
    attempts: 1, // Instant query için retry yapmıyoruz
    removeOnComplete: {
      age: 7 * 24 * 3600, // 7 gün sonra tamamlanan işleri sil
      count: 10000 // En fazla 10000 tamamlanan iş tut
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7 gün sonra başarısız işleri sil
    }
  };

  const job = await instantQueryQueue.add('process-query', data, jobOptions);
  const queueEvents = QueueConfig.getQueueEvents(QueueType.INSTANT_QUERY);
  
  // Sonucu bekle
  const result = await job.waitUntilFinished(queueEvents);
  
  return result;
};
