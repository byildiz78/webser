import { ConnectionPool, IResult } from 'mssql';
import net from 'net';
import { getAppSettings } from './settings';
import { getCachedQueryResult } from './redis';

export class Database {
    private pool: ConnectionPool | null = null;

    public async connect(databaseId: string, apiKey: string): Promise<void> {
        const appSettings = getAppSettings();
            
        const tenantConfig = appSettings.connections.find(connection => 
            (connection.databaseId === parseInt(databaseId) || connection.tenantId === databaseId) && connection.apiKey === apiKey
        );
        
        if (!tenantConfig) {
            throw new Error(`Tenant configuration not found for ID: ${databaseId} and apiKey: ${apiKey}`);
        }
        this.pool = await new ConnectionPool(tenantConfig).connect();
    }

    public async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }

    public async testServerConnection(databaseId: string, apiKey: string): Promise<boolean> {
        try {
            const appSettings = getAppSettings();
            if (databaseId && apiKey) {
                const serverConfig = appSettings.connections.find(connection => 
                    (connection.databaseId === parseInt(databaseId) || connection.tenantId === databaseId) && connection.apiKey === apiKey
                );
                if (!serverConfig) {
                    throw new Error('Server configuration not found');
                }

                console.log('Server Config:', {
                    server: serverConfig.server,
                    port: serverConfig.port,
                    databaseId: serverConfig.databaseId
                });

                return new Promise((resolve) => {
                    const socket = new net.Socket();
                    const timeout = 20000;
    
                    socket.setTimeout(timeout);
    
                    socket.on('connect', () => {
                        console.log('Socket connected successfully');
                        socket.destroy();
                        resolve(true);
                    });
    
                    socket.on('timeout', () => {
                        console.log('Socket connection timed out');
                        socket.destroy();
                        resolve(false);
                    });
    
                    socket.on('error', (err) => {
                        console.log('Socket connection error:', err.message);
                        socket.destroy();
                        resolve(false);
                    });
    
                    console.log('Attempting to connect to:', {
                        host: serverConfig.server,
                        port: serverConfig.port || 0
                    });

                    socket.connect({
                        host: serverConfig.server,
                        port: serverConfig.port || 1433 // SQL Server default port if not specified
                    });
                });
            }  else {
                throw new Error('No server configuration available');
            }
        } catch (error) {
            console.log('Test server connection error:', error);
            return false;
        }
    }

    public async testDatabaseConnection(databaseId: string, apiKey: string): Promise<boolean> {
        try {
            const result = await this.query('SELECT 1 as test', databaseId, apiKey);
            return result?.length === 1;
        } catch (error) {
            return false;
        }
    }

    public async query<T = any>(sql: string, databaseId: string, apiKey: string, params?: Record<string, any>, skipCache: boolean = false): Promise<T[] | undefined> {
        try {
            let response: IResult<T> | undefined
            
            if(skipCache){
                response = await this.executeQuery(sql, databaseId, apiKey, params);

            }else{
                const cachedResult = await getCachedQueryResult<IResult<T>>(databaseId, sql, params);
                if (cachedResult === null) {
                    response = await this.executeQuery(sql, databaseId, apiKey, params);
                } else {
                    response = cachedResult;
                }
            }
            return response?.recordset;    
        } catch (error) {
            console.error('Query error:', error);
            throw new Error(`Query execution failed: ${error}`);
        }
    }

    private async executeQuery<T = any>(sql: string, databaseId: string, apiKey: string, params?: Record<string, any>): Promise<IResult<T> | undefined> {
        try {
            await this.connect(databaseId, apiKey);
            
            if (!this.pool) {
                throw new Error('Database connection failed');
            }

            const request = this.pool.request();
            
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    request.input(key, value);
                });
            }
            const response = await request.query<T>(sql);
            await this.disconnect();
            return response;
        } catch (error) {
            console.error('Query error:', error);
            throw new Error(`Query execution failed: ${error}`);
        }
    }
}