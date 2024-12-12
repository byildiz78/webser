import fs from 'fs';
import path from 'path';
import { AppSettings } from '@/types/config';
import { NextRequest } from 'next/server';

export function getAppSettings(): AppSettings {
    const appSettingsPath = path.join(process.cwd(), 'appSettings.json');
    try {
        const rawData = fs.readFileSync(appSettingsPath, 'utf8');
        return JSON.parse(rawData);
    } catch (error) {
        throw new Error(`Failed to read appSettings.json: ${error}`);
    }
}


export function getApiKey(request: NextRequest): string  {
    try {
        return request.headers.get('authorization') || '';
    } catch (error) {
        throw new Error(`No Authorization Found: ${error}`);
    }
}