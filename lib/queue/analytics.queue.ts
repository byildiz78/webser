import QueueConfig, { QueueType } from './config';

// Analytics işlerini işleyen worker
const analyticsProcessor = async (job: any) => {
  const { data } = job;
  
  try {
    // Analitik verilerini işle
    console.log(`Processing analytics data: ${JSON.stringify(data)}`);
    // TODO: Implement analytics processing logic
    
    return { success: true, processedAt: new Date() };
  } catch (error) {
    console.error(`Error processing analytics data: ${error}`);
    throw error;
  }
};

// Analytics queue'sunu ve worker'ını oluştur
const analyticsQueue = QueueConfig.getQueue(QueueType.ANALYTICS);
const analyticsWorker = QueueConfig.createWorker(QueueType.ANALYTICS, analyticsProcessor);

// Analytics işi ekleme fonksiyonu
export const addAnalyticsJob = async (data: any) => {
  return await analyticsQueue.add('process-analytics', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  });
};

export default analyticsQueue;
