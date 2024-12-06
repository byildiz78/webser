import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export async function GET(request: NextRequest) {
    try {
        const swaggerPath = join(process.cwd(), 'swagger.yaml');
        const swaggerContent = readFileSync(swaggerPath, 'utf8');
        const swaggerDoc = yaml.load(swaggerContent);

        return NextResponse.json(swaggerDoc);
    } catch (error) {
        console.error('Error loading Swagger documentation:', error);
        return NextResponse.json(
            { error: 'Failed to load API documentation' },
            { status: 500 }
        );
    }
}
