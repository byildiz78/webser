const express = require('express');
const session = require('express-session');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis bağlantısı
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
});

// Rate limit ayarları
const rateLimits = {
    'default': { limit: 100, window: 60 * 1000 }, // 100 istek/dakika
    'high': { limit: 1000, window: 60 * 1000 }, // 1000 istek/dakika
    'low': { limit: 10, window: 60 * 1000 } // 10 istek/dakika
};

// Queue'ları oluştur
const queueConfigs = [
    { name: 'analytics', concurrency: 2 },
    { name: 'bigquery', concurrency: 2 },
    { name: 'rate-limit', concurrency: 2 },
    { name: 'instant-query', concurrency: 2 }
];

// Queue ve Worker'ları oluştur
const queueMap = new Map();

queueConfigs.forEach(config => {
    // Queue'yu oluştur
    const queue = new Queue(config.name, { 
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: false,
            removeOnFail: false
        }
    });

    // Worker'ı oluştur
    const worker = new Worker(
        config.name,
        async job => {
            console.log(`[${config.name}] Processing job ${job.id}`);
            await job.updateProgress(0);

            if (config.name === 'rate-limit') {
                const { apiKey, endpoint } = job.data;
                const limit = rateLimits[apiKey] || rateLimits.default;
                
                // Rate limit kontrolü
                const now = Date.now();
                const key = `${apiKey}:${endpoint}:${Math.floor(now / limit.window)}`;
                const count = await connection.incr(key);
                await connection.expire(key, Math.ceil(limit.window / 1000));

                if (count > limit.limit) {
                    throw new Error(`Rate limit exceeded for ${apiKey}. Limit: ${limit.limit} requests per ${limit.window/1000} seconds`);
                }

                // Rate limit durumunu güncelle
                const remaining = limit.limit - count;
                const resetTime = Math.ceil((Math.floor(now / limit.window) + 1) * limit.window);

                await job.updateProgress(100);
                return {
                    success: true,
                    limit: limit.limit,
                    remaining,
                    reset: new Date(resetTime).toISOString(),
                    window: `${limit.window/1000} seconds`
                };
            } else {
                // Diğer worker'lar için simüle edilmiş iş
                for (let i = 0; i <= 100; i += 20) {
                    await job.updateProgress(i);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            console.log(`[${config.name}] Completed job ${job.id}`);
            return { processed: true, jobId: job.id, completedAt: new Date() };
        },
        {
            connection,
            concurrency: config.concurrency,
            prefix: 'bull',
            metrics: { 
                maxDataPoints: 24 * 60 * 60,
                collectInterval: 1000
            },
            autorun: true,
            lockDuration: 30000,
            lockRenewTime: 15000
        }
    );

    // Worker event listeners
    worker.on('completed', job => {
        console.log(`[${config.name}] Job ${job.id} completed successfully:`, job.returnvalue);
    });

    worker.on('failed', (job, err) => {
        console.error(`[${config.name}] Job ${job.id} failed:`, err.message);
    });

    worker.on('active', job => {
        console.log(`[${config.name}] Job ${job.id} started processing`);
    });

    worker.on('progress', (job, progress) => {
        console.log(`[${config.name}] Job ${job.id} progress:`, progress);
    });

    worker.on('error', err => {
        console.error(`[${config.name}] Worker error:`, err);
    });

    queueMap.set(config.name, { queue, worker });
});

const app = express();

// Session middleware
app.use(session({
    secret: 'bull-board-secret',
    resave: false,
    saveUninitialized: false
}));

// Express middleware
app.use(express.urlencoded({ extended: true }));

// Bull Board setup
const serverAdapter = new ExpressAdapter();

createBullBoard({
    queues: Array.from(queueMap.entries()).map(([name, { queue, worker }]) => 
        new BullMQAdapter(queue, { 
            readOnlyMode: false,
            prefix: 'bull',
            worker,
            description: name === 'rate-limit' 
                ? `Rate Limits - Default: ${rateLimits.default.limit}/min, High: ${rateLimits.high.limit}/min, Low: ${rateLimits.low.limit}/min`
                : `${name} worker (concurrency: 2)`,
            options: {
                metrics: true,
                retryOnError: true,
                retryDelay: 1000,
                retryLimit: 3
            }
        })
    ),
    serverAdapter,
    options: {
        uiConfig: {
            boardTitle: 'Queue Dashboard',
            boardDescription: 'Worker concurrency: 2 per queue',
            queueList: {
                expanded: true
            },
            misc: {
                pollInterval: 1000
            }
        }
    }
});

// Login sayfası
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/ui');
        return;
    }
    
    res.send(`
        <html>
            <head>
                <title>Queue Dashboard Login</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f5f5f5;
                    }
                    .login-container {
                        background-color: white;
                        padding: 2rem;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .form-group {
                        margin-bottom: 1rem;
                    }
                    label {
                        display: block;
                        margin-bottom: 0.5rem;
                    }
                    input {
                        padding: 0.5rem;
                        width: 100%;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                    }
                    button {
                        background-color: #007bff;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: #0056b3;
                    }
                    .error {
                        color: red;
                        margin-top: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="login-container">
                    <h2>Queue Dashboard Login</h2>
                    <form action="/login" method="POST">
                        <div class="form-group">
                            <label for="apiKey">API Key:</label>
                            <input type="password" id="apiKey" name="apiKey" required>
                        </div>
                        <button type="submit">Login</button>
                        ${req.session.error ? `<div class="error">${req.session.error}</div>` : ''}
                    </form>
                </div>
            </body>
        </html>
    `);
    // Hata mesajını temizle
    delete req.session.error;
});

// Login endpoint'i
app.post('/login', (req, res) => {
    const { apiKey } = req.body;
    
    if (apiKey === '123') {
        req.session.isAuthenticated = true;
        res.redirect('/ui');
    } else {
        req.session.error = 'Invalid API key';
        res.redirect('/');
    }
});

// Authentication middleware
app.use('/ui', (req, res, next) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/');
        return;
    }
    next();
});

// Bull Board router
serverAdapter.setBasePath('/ui');
app.use('/ui', serverAdapter.getRouter());

// Test endpoint - Rate Limit
app.get('/test-rate-limit', async (req, res) => {
    try {
        const { queue } = queueMap.get('rate-limit');
        const apiKey = req.query.type || 'default'; // 'default', 'high', 'low'
        const endpoint = '/api/test';

        const job = await queue.add('rate-limit-check', {
            apiKey,
            endpoint,
            timestamp: new Date().toISOString()
        });

        res.json({ message: 'Rate limit check started', jobId: job.id });
    } catch (error) {
        console.error('Error checking rate limit:', error);
        res.status(500).json({ error: 'Failed to check rate limit' });
    }
});

// Test endpoint - Analytics
app.get('/test-queue', async (req, res) => {
    try {
        const { queue } = queueMap.get('analytics');
        const job = await queue.add('test-job', {
            data: 'test data',
            timestamp: new Date().toISOString()
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: false,
            removeOnFail: false
        });
        res.json({ message: 'Test job added successfully', jobId: job.id });
    } catch (error) {
        console.error('Error adding test job:', error);
        res.status(500).json({ error: 'Failed to add test job' });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down workers...');
    for (const { worker } of queueMap.values()) {
        await worker.close();
    }
    process.exit(0);
});

const port = process.env.BULL_BOARD_PORT || 3100;
app.listen(port, () => {
    console.log(`Queue Dashboard running on http://localhost:${port}`);
});
