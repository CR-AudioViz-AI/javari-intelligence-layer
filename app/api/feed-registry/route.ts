// =====================================================
// JAVARI FEED REGISTRY API (FIXED FOR NEXT.JS)
// Created: November 16, 2025 - 6:25 PM EST
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Use dynamic import for rss-parser (CommonJS module)
let Parser: any;

async function getRSSParser(): Promise<any> {
  if (!Parser) {
    const module = await import('rss-parser');
    Parser = module.default || module;
  }
  return new Parser({
    customFields: {
      item: [
        ['media:content', 'media'],
        ['dc:creator', 'author']
      ]
    }
  });
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  domain: string;
  bias_score: number;
  source_tier: number;
  last_fetched_at: string | null;
}

interface FeedItem {
  title: string;
  description: string;
  url: string;
  published_at: string;
  author: string | null;
  sentiment_score: number | null;
  keywords: string[];
}

// =====================================================
// SENTIMENT ANALYSIS
// =====================================================

async function analyzeSentiment(text: string): Promise<number> {
  const positive = ['great', 'amazing', 'wonderful', 'success', 'victory', 'win', 'breakthrough', 'excellent'];
  const negative = ['terrible', 'awful', 'disaster', 'fail', 'crisis', 'tragedy', 'death', 'controversy'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positive.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });
  
  negative.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

// =====================================================
// KEYWORD EXTRACTION
// =====================================================

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  
  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// =====================================================
// EVENT DETECTION
// =====================================================

async function detectEvents(feedItems: FeedItem[]): Promise<void> {
  const keywordFrequency: Record<string, { count: number; items: FeedItem[] }> = {};
  
  feedItems.forEach(item => {
    item.keywords.forEach(keyword => {
      if (!keywordFrequency[keyword]) {
        keywordFrequency[keyword] = { count: 0, items: [] };
      }
      keywordFrequency[keyword].count++;
      keywordFrequency[keyword].items.push(item);
    });
  });
  
  const potentialEvents = Object.entries(keywordFrequency)
    .filter(([, data]) => data.count >= 3)
    .sort(([, a], [, b]) => b.count - a.count);
  
  for (const [keyword, data] of potentialEvents) {
    const { data: existing } = await supabase
      .from('detected_events')
      .select('id')
      .eq('title', keyword)
      .eq('is_active', true)
      .single();
    
    if (!existing) {
      const avgSentiment = data.items.reduce((sum, item) => 
        sum + (item.sentiment_score || 0), 0) / data.items.length;
      
      const urgencyScore = Math.min(10, Math.floor(data.count * 2));
      
      await supabase
        .from('detected_events')
        .insert({
          title: keyword,
          description: `Trending topic detected from ${data.count} news sources`,
          event_type: data.count >= 5 ? 'breaking_news' : 'trend',
          domain: 'politics',
          urgency_score: urgencyScore,
          virality_score: Math.min(10, data.count),
          controversy_score: Math.abs(avgSentiment) > 0.5 ? 8 : 3,
          audience_polarity: avgSentiment > 0.3 ? 'right' : avgSentiment < -0.3 ? 'left' : 'neutral',
          contributing_item_count: data.count,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      
      console.log(`✅ Detected event: "${keyword}" (${data.count} mentions)`);
    }
  }
}

// =====================================================
// FETCH SINGLE FEED
// =====================================================

async function fetchFeed(source: FeedSource): Promise<number> {
  try {
    console.log(`Fetching: ${source.name}...`);
    
    const parser = await getRSSParser();
    const feed = await parser.parseURL(source.url);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(`⚠️ No items in ${source.name}`);
      return 0;
    }
    
    const items: FeedItem[] = [];
    
    for (const item of feed.items.slice(0, 20)) {
      if (!item.title || !item.link) continue;
      
      const text = `${item.title} ${item.contentSnippet || item.description || ''}`;
      const sentiment = await analyzeSentiment(text);
      const keywords = extractKeywords(text);
      
      items.push({
        title: item.title,
        description: item.contentSnippet || item.description || '',
        url: item.link,
        published_at: item.pubDate || new Date().toISOString(),
        author: item.author || item.creator || null,
        sentiment_score: sentiment,
        keywords
      });
    }
    
    for (const item of items) {
      await supabase
        .from('feed_items')
        .upsert({
          feed_source_id: source.id,
          title: item.title,
          description: item.description,
          url: item.url,
          published_at: item.published_at,
          author: item.author,
          sentiment_score: item.sentiment_score,
          keywords: item.keywords,
          is_processed: true,
          processed_at: new Date().toISOString()
        }, {
          onConflict: 'feed_source_id,url',
          ignoreDuplicates: true
        });
    }
    
    await supabase
      .from('feed_sources')
      .update({ last_fetched_at: new Date().toISOString() })
      .eq('id', source.id);
    
    console.log(`✅ ${source.name}: ${items.length} items processed`);
    
    return items.length;
    
  } catch (error: any) {
    console.error(`❌ Error fetching ${source.name}:`, error);
    return 0;
  }
}

// =====================================================
// MAIN API HANDLER
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🚀 Starting Feed Registry ingestion...');
    const startTime = Date.now();
    
    const { data: sources, error: sourcesError } = await supabase
      .from('feed_sources')
      .select('*')
      .eq('is_active', true);
    
    if (sourcesError) throw sourcesError;
    if (!sources || sources.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No active feed sources found' 
      }, { status: 404 });
    }
    
    console.log(`Found ${sources.length} active feed sources`);
    
    let totalItems = 0;
    const results = [];
    
    for (const source of sources) {
      const itemCount = await fetchFeed(source);
      totalItems += itemCount;
      results.push({
        source: source.name,
        items: itemCount
      });
    }
    
    const { data: recentItems } = await supabase
      .from('feed_items')
      .select('title, description, url, published_at, author, sentiment_score, keywords')
      .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('published_at', { ascending: false });
    
    if (recentItems && recentItems.length > 0) {
      await detectEvents(recentItems);
    }
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      summary: {
        sources_checked: sources.length,
        total_items: totalItems,
        duration_ms: duration,
        results
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Feed registry error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'your-secret-here';
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ 
      success: false, 
      error: 'Unauthorized' 
    }, { status: 401 });
  }
  
  return GET(request);
}
