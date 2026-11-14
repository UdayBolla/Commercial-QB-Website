import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function GET() {
  try {
    await dbConnect();
    const isConnected = mongoose.connection.readyState === 1;

    if (!isConnected) {
      return NextResponse.json(
        { status: 'degraded', database: 'disconnected' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: 'ready', database: 'connected', timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message || 'Database error' },
      { status: 503 }
    );
  }
}
