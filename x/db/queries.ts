import { getConnection, closeConnection } from './connection';

export async function executeQuery<T>(query: string): Promise<T> {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export async function testConnection() {
  let pool = null;
  try {
    pool = await getConnection();
    await pool.request().query('SELECT 1');
    
    return {
      success: true,
      message: 'Connection successful',
      details: {
        server: `${pool.config.server}`,
        database: pool.config.database,
        user: pool.config.user
      }
    };
  } catch (error: any) {
    console.error('Test connection error:', error);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      details: {
        server: pool?.config.server || 'srv9.robotpos.com,1281',
        database: pool?.config.database || 'DemoDB',
        user: pool?.config.user || 'burhan'
      }
    };
  } finally {
    if (pool) {
      await closeConnection();
    }
  }
}