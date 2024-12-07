import QueueConfig, { QueueType } from './config';

// Rate limit işlerini işleyen worker
const rateLimitProcessor = async (job: any) => {
  const { data } = job;
  
  try {
    // Rate limit verilerini işle
    console.log(`Processing rate limit data: ${JSON.stringify(data)}`);
    // TODO: Implement rate limit processing logic
    
    return { success: true, processedAt: new Date() };
  } catch (error) {
    console.error(`Error processing rate limit data: ${error}`);
    throw error;
  }
};

// Rate limit queue'sunu ve worker'ını oluştur
const rateLimitQueue = QueueConfig.getQueue(QueueType.RATE_LIMIT);
const rateLimitWorker = QueueConfig.createWorker(QueueType.RATE_LIMIT, rateLimitProcessor);

// Rate limit işi ekleme fonksiyonu
export const addRateLimitJob = async (data: any) => {
  return await rateLimitQueue.add('process-rate-limit', data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true, // İşlem tamamlandığında queue'dan kaldır
  });
};

export default rateLimitQueue;
