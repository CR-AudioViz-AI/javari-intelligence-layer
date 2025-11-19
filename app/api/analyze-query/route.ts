/**
 * Javari AI - Phase 2 Intelligence Layer
 * API: Analyze Query & Semantic Search
 * 
 * Endpoint: POST /api/analyze-query
 * Purpose: Analyze user query, perform semantic search, track metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateEmbedding, analyzeQuery } from '@/lib/embeddings';

export const dynamic = 'force-dynamic';

interface SearchRequest {
  query: string;
  searchType?: 'semantic' | 'hybrid' | 'fulltext';
  matchThreshold?: number;
  matchCount?: number;
  sourceIds?: string[];
  trackQuery?: boolean;
  sessionId?: string;
  userId?: string;
  conversationId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body: SearchRequest = await request.json();
    const { 
      query, 
      searchType = 'hybrid',
      matchThreshold = 0.7,
      matchCount = 10,
      sourceIds,
      trackQuery = true,
      sessionId,
      userId,
      conversationId
    } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`[API] Processing query: "${query}" (type: ${searchType})`);

    // Step 1: Analyze query
    const analysis = await analyzeQuery(query);
    console.log('[API] Query analysis:', analysis);

    // Step 2: Generate embedding for semantic search
    let queryEmbedding: number[] | null = null;
    if (searchType === 'semantic' || searchType === 'hybrid') {
      const { embedding } = await generateEmbedding(query);
      queryEmbedding = embedding;
    }

    // Step 3: Perform search
    let results: any[] = [];
    let searchMethod = '';

    if (searchType === 'semantic' && queryEmbedding) {
      // Semantic search only
      const { data, error } = await supabase.rpc('search_documentation_semantic', {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: matchThreshold,
        match_count: matchCount,
        filter_source_ids: sourceIds || null,
      });

      if (error) throw error;
      results = data || [];
      searchMethod = 'semantic';

    } else if (searchType === 'hybrid' && queryEmbedding) {
      // Hybrid search (semantic + full-text)
      const { data, error } = await supabase.rpc('search_documentation_hybrid', {
        query_text: query,
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: matchCount,
        semantic_weight: 0.7,
      });

      if (error) throw error;
      results = data || [];
      searchMethod = 'hybrid';

    } else {
      // Full-text search fallback
      const { data, error } = await supabase
        .from('documentation_pages')
        .select(`
          id,
          title,
          url,
          content,
          section,
          knowledge_sources!inner(name)
        `)
        .textSearch('title || content', query, {
          type: 'websearch',
          config: 'english',
        })
        .limit(matchCount);

      if (error) throw error;
      
      results = (data || []).map(page => ({
        page_id: page.id,
        title: page.title,
        url: page.url,
        content: page.content,
        section: page.section,
        source_name: (page as any).knowledge_sources?.name,
        similarity: null,
      }));
      searchMethod = 'fulltext';
    }

    const responseTime = Date.now() - startTime;
    const foundInDocs = results.length > 0;
    const topSimilarity = results[0]?.similarity || results[0]?.combined_score || null;

    console.log(`[API] Found ${results.length} results in ${responseTime}ms`);

    // Step 4: Track query in database (if enabled)
    let queryId: string | null = null;
    if (trackQuery) {
      try {
        const { data: queryData, error: queryError } = await supabase
          .from('user_queries')
          .insert({
            query_text: query,
            query_embedding: queryEmbedding ? JSON.stringify(queryEmbedding) : null,
            query_intent: analysis.intent,
            query_complexity: analysis.complexity,
            detected_topics: analysis.topics.length > 0 ? analysis.topics : null,
            detected_languages: analysis.languages.length > 0 ? analysis.languages : null,
            found_in_docs: foundInDocs,
            relevant_page_ids: results.map(r => r.page_id).slice(0, 10),
            top_similarity_score: topSimilarity,
            response_generated: true,
            response_time_ms: responseTime,
            session_id: sessionId,
            user_id: userId,
            conversation_id: conversationId,
            metadata: {
              search_method: searchMethod,
              result_count: results.length,
            },
          })
          .select('id')
          .single();

        if (!queryError && queryData) {
          queryId = queryData.id;
          console.log(`[API] Query tracked with ID: ${queryId}`);
        }
      } catch (error: any) {
        console.error('[API] Failed to track query:', error);
        // Don't fail the request if tracking fails
      }
    }

    // Step 5: Return results
    return NextResponse.json({
      success: true,
      query: {
        text: query,
        analysis,
        queryId,
      },
      search: {
        method: searchMethod,
        resultCount: results.length,
        responseTime,
        foundInDocs,
      },
      results: results.slice(0, matchCount),
    });

  } catch (error: any) {
    console.error('[API] Query processing failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve similar past queries
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Generate embedding for query
    const { embedding } = await generateEmbedding(query);

    // Find similar queries
    const { data, error } = await supabase.rpc('find_similar_queries', {
      query_embedding: JSON.stringify(embedding),
      similarity_threshold: 0.85,
      max_results: limit,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      similarQueries: data || [],
    });

  } catch (error: any) {
    console.error('[API] Failed to find similar queries:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
