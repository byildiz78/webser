import QueueConfig, { QueueType } from './config';

// BigQuery işlerini işleyen worker
const bigqueryProcessor = async (job: any) => {
  const { data } = job;
  
  try {
    // BigQuery sorgusunu işle
    console.log(`Processing BigQuery job: ${JSON.stringify(data)}`);
    // TODO: Implement BigQuery processing logic
    
    return { success: true, processedAt: new Date() };
  } catch (error) {
    console.error(`Error processing BigQuery job: ${error}`);
    throw error;
  }
};

// BigQuery queue'sunu ve worker'ını oluştur
const bigqueryQueue = QueueConfig.getQueue(QueueType.BIGQUERY);
const bigqueryWorker = QueueConfig.createWorker(QueueType.BIGQUERY, bigqueryProcessor);

// BigQuery işi ekleme fonksiyonu
export const addBigQueryJob = async (data: any) => {
  return await bigqueryQueue.add('process-query', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    timeout: 300000, // 5 dakika timeout
  });
};

export default bigqueryQueue;
