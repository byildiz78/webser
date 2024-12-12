import sql from 'mssql';
import { dbConfig } from './config';

let pool: sql.ConnectionPool | null = null;

export async function getConnection() {
  try {
    if (!pool) {
      pool = await new sql.ConnectionPool(dbConfig).connect();
      console.log('New SQL connection pool created');
    }
    return pool;
  } catch (error) {
    console.error('Failed to create connection pool:', error);
    throw error;
  }
}

export async function closeConnection() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
    } catch (error) {
      console.error('Error closing pool:', error);
      throw error;
    }
  }
}