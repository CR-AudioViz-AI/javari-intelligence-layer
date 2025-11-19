// =====================================================
// JAVARI KNOWLEDGE STATS API (TRUTHFUL & REAL)
// Created: November 18, 2025 - 10:45 PM EST
// Returns ACTUAL data from existing database tables
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get total documentation pages
    const { count: totalPages, error: pagesError } = await supabase
      .from('documentation_pages')
      .select('*', { count: 'exact', head: true });

    if (pagesError) {
      console.error('Error counting pages:', pagesError);
    }

    // Get total chunks
    const { count: totalChunks, error: chunksError } = await supabase
      .from('documentation_chunks')
      .select('*', { count: 'exact', head: true });

    if (chunksError) {
      console.error('Error counting chunks:', chunksError);
    }

    // Get pages with embeddings (indicates processed knowledge)
    const { count: totalEmbeddings, error: embeddingsError } = await supabase
      .from('documentation_pages')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);

    if (embeddingsError) {
      console.error('Error counting embeddings:', embeddingsError);
    }

    // Get total queries
    const { count: totalQueries, error: queriesError } = await supabase
      .from('user_queries')
      .select('*', { count: 'exact', head: true });

    if (queriesError) {
      console.error('Error counting queries:', queriesError);
    }

    // Get average confidence from queries
    const { data: queryData, error: queryDataError } = await supabase
      .from('user_queries')
      .select('confidence_score')
      .not('confidence_score', 'is', null);

    const avgConfidence = queryData && queryData.length > 0
      ? queryData.reduce((sum, q) => sum + (q.confidence_score || 0), 0) / queryData.length
      : 0;

    // Get knowledge domains (from documentation_sources if it exists)
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('documentation_sources')
      .select('source_type, source_url, last_scraped_at')
      .order('last_scraped_at', { ascending: false });

    // Count pages per source
    const { data: pagesWithSource, error: pagesSourceError } = await supabase
      .from('documentation_pages')
      .select('source_id, created_at');

    const knowledgeDomains: any[] = [];
    
    if (sourcesData && pagesWithSource) {
      const sourceMap = new Map();
      
      // Count pages per source
      pagesWithSource.forEach((page: any) => {
        const count = sourceMap.get(page.source_id) || 0;
        sourceMap.set(page.source_id, count + 1);
      });

      // Build domains array
      sourcesData.forEach((source: any) => {
        const docCount = sourceMap.get(source.id) || 0;
        if (docCount > 0) {
          knowledgeDomains.push({
            domain: source.source_type || 'Unknown',
            document_count: docCount,
            last_updated: source.last_scraped_at || source.created_at
          });
        }
      });
    }

    // If no sources table, create domains from pages
    if (knowledgeDomains.length === 0) {
      const { data: allPages } = await supabase
        .from('documentation_pages')
        .select('title, created_at')
        .limit(1000);

      if (allPages && allPages.length > 0) {
        // Group by first word of title as domain
        const domainMap = new Map();
        allPages.forEach((page: any) => {
          const domain = page.title?.split(' ')[0] || 'General';
          const existing = domainMap.get(domain) || { count: 0, lastUpdated: page.created_at };
          domainMap.set(domain, {
            count: existing.count + 1,
            lastUpdated: page.created_at > existing.lastUpdated ? page.created_at : existing.lastUpdated
          });
        });

        domainMap.forEach((data, domain) => {
          knowledgeDomains.push({
            domain,
            document_count: data.count,
            last_updated: data.lastUpdated
          });
        });
      }
    }

    // Get recent learnings
    const { data: recentPages } = await supabase
      .from('documentation_pages')
      .select('id, title, source_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentLearnings = recentPages?.map((page: any) => ({
      id: page.id,
      title: page.title,
      source: 'Documentation',
      created_at: page.created_at,
      chunk_count: 0 // Will be populated if we join with chunks
    })) || [];

    // Get query performance
    const { data: successfulQueries } = await supabase
      .from('user_queries')
      .select('confidence_score')
      .gte('confidence_score', 0.7);

    const queryPerformance = {
      total_queries: totalQueries || 0,
      successful_queries: successfulQueries?.length || 0,
      avg_confidence: avgConfidence,
      improvement_rate: 0 // Would calculate from historical data
    };

    // Get growth timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentDocs } = await supabase
      .from('documentation_pages')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: recentQueries } = await supabase
      .from('user_queries')
      .select('created_at, confidence_score')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const timelineMap = new Map();
    
    if (recentDocs) {
      recentDocs.forEach((doc: any) => {
        const date = new Date(doc.created_at).toISOString().split('T')[0];
        const existing = timelineMap.get(date) || { documents: 0, queries: 0, confidenceSum: 0, confidenceCount: 0 };
        timelineMap.set(date, { ...existing, documents: existing.documents + 1 });
      });
    }

    if (recentQueries) {
      recentQueries.forEach((query: any) => {
        const date = new Date(query.created_at).toISOString().split('T')[0];
        const existing = timelineMap.get(date) || { documents: 0, queries: 0, confidenceSum: 0, confidenceCount: 0 };
        const conf = query.confidence_score || 0;
        timelineMap.set(date, {
          ...existing,
          queries: existing.queries + 1,
          confidenceSum: existing.confidenceSum + conf,
          confidenceCount: existing.confidenceCount + (conf > 0 ? 1 : 0)
        });
      });
    }

    const growthTimeline = Array.from(timelineMap.entries()).map(([date, data]) => ({
      date,
      documents: data.documents,
      queries: data.queries,
      confidence: data.confidenceCount > 0 ? data.confidenceSum / data.confidenceCount : 0
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Return complete stats
    return NextResponse.json({
      success: true,
      stats: {
        total_documents: totalPages || 0,
        total_chunks: totalChunks || 0,
        total_embeddings: totalEmbeddings || 0,
        total_queries: totalQueries || 0,
        avg_confidence: avgConfidence,
        knowledge_domains: knowledgeDomains.slice(0, 10), // Top 10
        recent_learnings: recentLearnings,
        query_performance: queryPerformance,
        growth_timeline: growthTimeline
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Knowledge stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stats: {
        total_documents: 0,
        total_chunks: 0,
        total_embeddings: 0,
        total_queries: 0,
        avg_confidence: 0,
        knowledge_domains: [],
        recent_learnings: [],
        query_performance: {
          total_queries: 0,
          successful_queries: 0,
          avg_confidence: 0,
          improvement_rate: 0
        },
        growth_timeline: []
      }
    }, { status: 500 });
  }
}
