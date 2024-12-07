import sql from 'mssql';
import { initializeLogTable } from './logger';

const config: sql.config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  server: process.env.SQL_SERVER_HOST || '',
  port: parseInt(process.env.SQL_SERVER_PORT || '1281'),
  database: process.env.SQL_SERVER_DB,
  options: {
    encrypt: process.env.ENCRYPTION === 'yes',
    trustServerCertificate: process.env.TRUST_SERVER_CERTIFICATE === 'true',
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 50, // maksimum bağlantı sayısı
    min: 10, // minimum bağlantı sayısı
    idleTimeoutMillis: 30000, // boşta bekleyen bağlantıların timeout süresi
    acquireTimeoutMillis: 30000, // yeni bağlantı alma timeout süresi
    createTimeoutMillis: 30000, // yeni bağlantı oluşturma timeout süresi
    destroyTimeoutMillis: 5000, // bağlantı kapatma timeout süresi
    reapIntervalMillis: 1000, // havuz temizleme kontrol aralığı
    createRetryIntervalMillis: 200, // bağlantı oluşturma yeniden deneme aralığı
  }
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
  try {
    if (!pool) {
      console.log('Creating new SQL connection pool with config:', {
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user,
        poolConfig: config.pool
      });
      
      pool = await new sql.ConnectionPool(config).connect();
      
      // Pool events
      pool.on('error', err => {
        console.error('Pool error:', err);
      });

      pool.on('connect', () => {
        console.log('New connection established in pool');
      });

      console.log('Successfully connected to database');
      
      // Initialize log table on first connection
      console.log('Initializing log table...');
      await initializeLogTable();
      console.log('Log table initialization completed');
    }

    // Pool durumunu kontrol et
    if (!pool.connected) {
      console.log('Pool disconnected, reconnecting...');
      await pool.connect();
    }

    return pool;
  } catch (error) {
    console.error('Failed to create connection pool:', error);
    throw error;
  }
}

export async function executeQuery<T>(query: string, params?: Record<string, any>): Promise<T> {
  let retries = 3;
  let lastError: any;

  while (retries > 0) {
    try {
      const pool = await getConnection();
      const request = pool.request();

      // Add parameters if provided
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      console.log('Executing query:', query);
      if (params) {
        console.log('With parameters:', params);
      }

      const result = await request.query(query);
      return result.recordset as T;
    } catch (error: any) {
      lastError = error;
      retries--;

      if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') {
        console.log(`Connection error, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
        continue;
      }

      console.error('Error executing query:', error);
      throw error;
    }
  }

  throw lastError;
}

export async function testConnection() {
  try {
    const pool = await getConnection();
    await pool.request().query('SELECT 1');
    return { 
      success: true, 
      message: 'Connection successful',
      details: {
        server: config.server,
        database: config.database,
        user: config.user,
        port: config.port,
      }
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
      details: {
        server: config.server,
        database: config.database,
        user: config.user,
        port: config.port,
      }
    };
  }
}