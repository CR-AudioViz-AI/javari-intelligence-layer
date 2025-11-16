/**
 * Javari AI - Phase 2 Intelligence Layer
 * API: Generate Embeddings
 * 
 * Endpoint: POST /api/generate-embeddings
 * Purpose: Generate embeddings for documentation pages (can be triggered by cron)
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMissingEmbeddings, getEmbeddingStats } from '@/lib/embeddings';

export const maxDuration = 300; // 5 minutes max execution time
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 1000;
    const regenerate = body.regenerate || false;

    console.log(`[API] Starting embedding generation (limit: ${limit}, regenerate: ${regenerate})`);

    // Generate embeddings
    const result = await generateMissingEmbeddings(limit);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Generated embeddings for ${result.processed} pages`,
    });

  } catch (error: any) {
    console.error('[API] Embedding generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getEmbeddingStats();

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error: any) {
    console.error('[API] Failed to get embedding stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
