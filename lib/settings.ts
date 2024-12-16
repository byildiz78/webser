import fs from 'fs';
import path from 'path';
import { AppSettings } from '@/types/config';
import { NextRequest } from 'next/server';

function writeToLog(message: string) {
    const logPath = path.join(process.cwd(), 'app.log');
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    fs.appendFileSync(logPath, logMessage);
}

export function getAppSettings(): AppSettings {
    const possiblePaths = [
        path.join(process.cwd(), 'appSettings.json'),
        path.join(process.cwd(), '.next', 'standalone', 'appSettings.json'),
        path.join(process.cwd(), 'public', 'appSettings.json'),
        path.join(process.cwd(), '.next', 'standalone', 'public', 'appSettings.json')
    ];

    writeToLog(`Current working directory: ${process.cwd()}`);
    
    for (const filePath of possiblePaths) {
        writeToLog(`Checking path: ${filePath}`);
        try {
            if (fs.existsSync(filePath)) {
                writeToLog(`Found appSettings.json at: ${filePath}`);
                const rawData = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(rawData);
            }
        } catch (error) {
            writeToLog(`Failed to read from ${filePath}: ${error}`);
        }
    }

    const errorMessage = `appSettings.json not found in any of these locations: ${possiblePaths.join(', ')}`;
    writeToLog(`ERROR: ${errorMessage}`);
    throw new Error(errorMessage);
}

export function getApiKey(request: NextRequest): string  {
    try {
        return request.headers.get('Authorization')?.replace('Bearer', '').trim() || '';
    } catch (error) {
        writeToLog(`ERROR: No Authorization Found: ${error}`);
        throw new Error(`No Authorization Found: ${error}`);
    }
}

export function getUserAgent(request: NextRequest): string  {
    try {
        return request.headers.get('user-agent') ||  '';
    } catch (error) {
        writeToLog(`ERROR: No UserAgent Found: ${error}`);
        throw new Error(`No UserAgent Found: ${error}`);
    }
}