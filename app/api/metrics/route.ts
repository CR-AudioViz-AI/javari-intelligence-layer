/**
 * Javari AI - Phase 2 Intelligence Layer
 * API: Learning Metrics & Dashboard Data
 * 
 * Endpoint: GET /api/metrics
 * Purpose: Retrieve all learning metrics for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '24h';

    // Convert time range to interval
    const intervalMap: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
    };
    const interval = intervalMap[timeRange] || '24 hours';

    console.log(`[API] Fetching metrics for range: ${interval}`);

    // Fetch all metrics in parallel
    const [
      dashboardData,
      topGapsData,
      intentAnalysisData,
      embeddingStatsData,
      recentQueriesData,
    ] = await Promise.all([
      // Dashboard overview
      supabase.from('learning_dashboard').select('*').single(),
      
      // Top content gaps
      supabase.from('top_content_gaps').select('*').limit(10),
      
      // Query intent analysis
      supabase.from('query_intent_analysis').select('*'),
      
      // Embedding stats by source
      supabase.rpc('get_embedding_stats'),
      
      // Recent queries
      supabase
        .from('user_queries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Calculate metrics over time (for charts)
    const metricsOverTime = await getMetricsOverTime(interval);

    // Compile response
    const metrics = {
      overview: dashboardData.data || {},
      contentGaps: topGapsData.data || [],
      intentAnalysis: intentAnalysisData.data || [],
      embeddingStats: embeddingStatsData.data || [],
      recentQueries: recentQueriesData.data || [],
      metricsOverTime,
    };

    return NextResponse.json({
      success: true,
      timeRange,
      metrics,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[API] Failed to fetch metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper: Get metrics over time for charts
async function getMetricsOverTime(interval: string) {
  try {
    // Query resolution rate over time
    const { data: resolutionData } = await supabase.rpc('calculate_query_resolution_rate', {
      time_period: interval,
    });

    // User satisfaction over time
    const { data: satisfactionData } = await supabase.rpc('calculate_avg_satisfaction', {
      time_period: interval,
    });

    // Query volume over time (group by hour/day depending on interval)
    const groupByUnit = interval.includes('hour') ? 'hour' : 'day';
    const { data: volumeData } = await supabase
      .from('user_queries')
      .select('created_at, found_in_docs')
      .gte('created_at', `now() - interval '${interval}'`)
      .order('created_at', { ascending: true });

    // Group volume data by time unit
    const volumeByTime = groupQueryVolume(volumeData || [], groupByUnit);

    return {
      resolutionRate: resolutionData,
      averageSatisfaction: satisfactionData,
      queryVolume: volumeByTime,
    };
  } catch (error) {
    console.error('[API] Error getting metrics over time:', error);
    return null;
  }
}

// Helper: Group query volume by time unit
function groupQueryVolume(queries: any[], groupBy: 'hour' | 'day') {
  const groups: Record<string, { total: number; resolved: number }> = {};

  queries.forEach(query => {
    const date = new Date(query.created_at);
    let key: string;

    if (groupBy === 'hour') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    if (!groups[key]) {
      groups[key] = { total: 0, resolved: 0 };
    }

    groups[key].total++;
    if (query.found_in_docs) {
      groups[key].resolved++;
    }
  });

  return Object.entries(groups)
    .map(([time, data]) => ({
      time,
      total: data.total,
      resolved: data.resolved,
      resolutionRate: data.total > 0 ? (data.resolved / data.total) * 100 : 0,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

// POST endpoint to update query feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, satisfaction, feedback, wasHelpful } = body;

    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Query ID is required' },
        { status: 400 }
      );
    }

    // Update query with feedback
    const { data, error } = await supabase
      .from('user_queries')
      .update({
        user_satisfaction: satisfaction,
        user_feedback_text: feedback,
        was_helpful: wasHelpful,
      })
      .eq('id', queryId)
      .select()
      .single();

    if (error) throw error;

    console.log(`[API] Updated query ${queryId} with feedback`);

    return NextResponse.json({
      success: true,
      query: data,
    });

  } catch (error: any) {
    console.error('[API] Failed to update query feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
