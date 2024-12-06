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
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
  try {
    if (!pool) {
      console.log('Creating new SQL connection pool with config:', {
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user
      });
      
      pool = await new sql.ConnectionPool(config).connect();
      console.log('Successfully connected to database');
      
      // Initialize log table on first connection
      console.log('Initializing log table...');
      await initializeLogTable();
      console.log('Log table initialization completed');
    }
    return pool;
  } catch (error) {
    console.error('Failed to create connection pool:', error);
    throw error;
  }
}

export async function executeQuery<T>(query: string, params?: Record<string, any>): Promise<T> {
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
    return result.recordset;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
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