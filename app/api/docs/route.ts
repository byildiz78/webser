import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export async function GET(request: NextRequest) {
    try {
        // Read and parse swagger.yaml
        const swaggerPath = join(process.cwd(), 'swagger.yaml');
        const swaggerContent = readFileSync(swaggerPath, 'utf8');
        const swaggerDoc = yaml.load(swaggerContent);

        // Set CORS headers
        return new NextResponse(JSON.stringify(swaggerDoc), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (error) {
        console.error('Error loading Swagger documentation:', error);
        return NextResponse.json(
            { error: 'Failed to load API documentation' },
            { 
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            }
        );
    }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
