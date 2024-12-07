const express = require('express');
const session = require('express-session');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Redis bağlantısı
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
});

// Queue'ları oluştur
const analyticsQueue = new Queue('analytics', { connection });
const bigQueryQueue = new Queue('bigquery', { connection });
const rateLimitQueue = new Queue('rate-limit', { connection });

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
serverAdapter.setBasePath('/admin/queues'); // Bull Board base path'ini değiştirdik

createBullBoard({
    queues: [
        new BullMQAdapter(analyticsQueue),
        new BullMQAdapter(bigQueryQueue),
        new BullMQAdapter(rateLimitQueue)
    ],
    serverAdapter,
});

// Login sayfası
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/admin/queues');
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
        res.redirect('/admin/queues');
    } else {
        req.session.error = 'Invalid API key';
        res.redirect('/');
    }
});

// Authentication middleware
app.use('/admin/queues', (req, res, next) => {
    if (!req.session.isAuthenticated) {
        res.redirect('/');
        return;
    }
    next();
});

// Bull Board router
app.use('/admin/queues', serverAdapter.getRouter());

// Test endpoint
app.get('/test-queue', async (req, res) => {
    try {
        const job = await analyticsQueue.add('test-job', {
            data: 'test data',
            timestamp: new Date().toISOString()
        });
        res.json({ message: 'Test job added successfully', jobId: job.id });
    } catch (error) {
        console.error('Error adding test job:', error);
        res.status(500).json({ error: 'Failed to add test job' });
    }
});

const port = process.env.BULL_BOARD_PORT || 3001;
app.listen(port, () => {
    console.log(`Queue Dashboard running on http://localhost:${port}`);
});