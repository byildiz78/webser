import { NextResponse } from 'next/server';
import { testConnection } from '@/x/db/queries';

export async function POST() {
  try {
    const result = await testConnection();
    
    if (result.success) {
      return NextResponse.json({ 
        message: result.message,
        details: result.details
      });
    } else {
      return NextResponse.json(
        { 
          error: result.message,
          details: result.details
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An unexpected error occurred',
        details: {
          server: process.env.SQL_SERVER_HOST || 'srv9.robotpos.com,1281',
          database: process.env.SQL_SERVER_DB || 'DemoDB',
          user: process.env.SQL_SERVER_USER || 'burhan'
        }
      },
      { status: 500 }
    );
  }
}