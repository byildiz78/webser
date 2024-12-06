interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute

export async function rateLimit(identifier: string) {
  const now = Date.now();
  const windowData = store[identifier];

  if (!windowData || windowData.resetTime < now) {
    // First request or window expired
    store[identifier] = {
      count: 1,
      resetTime: now + WINDOW_SIZE,
    };
    return { success: true };
  }

  if (windowData.count >= MAX_REQUESTS) {
    return { success: false };
  }

  windowData.count++;
  return { success: true };
}
