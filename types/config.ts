
import { config } from 'mssql';

export type DatabaseConfig = {
    databaseId: number,
    tenantId: string
}

export type SQLConfig = config & DatabaseConfig & {
    apiKey: string
}

export type Admin = {
    apiKey: string;
}

export type AppSettings = {
    admin: Admin,
    connections: SQLConfig[]
}

export type HealthConnection = {
    databaseConnection: boolean,
    serverConnection: boolean
}