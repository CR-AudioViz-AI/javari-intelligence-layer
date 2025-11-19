// =====================================================
// JAVARI KNOWLEDGE UPLOAD API
// Created: November 18, 2025 - 10:50 PM EST
// Purpose: Manually feed Javari knowledge (files or text)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/embeddings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Chunk text into smaller pieces for better search
function chunkText(text: string, chunkSize: number = 500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 20); // Filter out tiny chunks
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type');
    
    let title: string;
    let content: string;
    let source: string = 'manual_upload';
    let category: string = 'user_provided';

    // Handle file upload
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'No file provided'
        }, { status: 400 });
      }

      title = file.name;
      const fileText = await file.text();
      content = fileText;
      
    } else {
      // Handle JSON text upload
      const body = await request.json();
      
      if (!body.title || !body.content) {
        return NextResponse.json({
          success: false,
          error: 'Title and content are required'
        }, { status: 400 });
      }

      title = body.title;
      content = body.content;
      source = body.source || 'manual_input';
      category = body.category || 'user_provided';
    }

    // Insert main documentation page
    const { data: docPage, error: docError } = await supabase
      .from('documentation_pages')
      .insert({
        title,
        content,
        url: `manual://${Date.now()}`,
        source_type: source,
        category
      })
      .select()
      .single();

    if (docError) {
      console.error('Error inserting documentation:', docError);
      return NextResponse.json({
        success: false,
        error: 'Failed to save documentation: ' + docError.message
      }, { status: 500 });
    }

    // Generate embedding for the full document
    let embedding: number[] | null = null;
    let embeddingError: any = null;

    try {
      const { embedding: docEmbedding } = await generateEmbedding(content.substring(0, 8000));
      embedding = docEmbedding;

      // Update page with embedding
      await supabase
        .from('documentation_pages')
        .update({ embedding: JSON.stringify(docEmbedding) })
        .eq('id', docPage.id);
        
    } catch (err: any) {
      console.error('Error generating embedding:', err);
      embeddingError = err.message;
    }

    // Chunk the content for better search
    const chunks = chunkText(content);
    const chunksInserted: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate embedding for chunk
        const { embedding: chunkEmbedding } = await generateEmbedding(chunk);

        // Insert chunk
        const { data: chunkData, error: chunkError } = await supabase
          .from('documentation_chunks')
          .insert({
            page_id: docPage.id,
            content: chunk,
            chunk_index: i,
            embedding: JSON.stringify(chunkEmbedding)
          })
          .select()
          .single();

        if (chunkError) {
          console.error('Error inserting chunk:', chunkError);
        } else {
          chunksInserted.push(chunkData);
        }
        
      } catch (err: any) {
        console.error(`Error processing chunk ${i}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: docPage.id,
        title: docPage.title,
        created_at: docPage.created_at
      },
      chunks_created: chunksInserted.length,
      total_chunks: chunks.length,
      embedding_generated: embedding !== null,
      embedding_error: embeddingError,
      message: `Successfully added "${title}" to Javari's knowledge base with ${chunksInserted.length} searchable chunks`
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
