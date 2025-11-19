/**
 * Javari AI - Phase 2 Intelligence Layer
 * OpenAI Embedding Service
 */

import OpenAI from 'openai';
import { supabase, type DocumentationPage } from './supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // Process 100 pages at a time
const MAX_TOKENS = 8000; // Truncate content if needed

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<{
  embedding: number[];
  tokenCount: number;
}> {
  const truncatedText = truncateText(text, MAX_TOKENS);
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncatedText,
  });

  return {
    embedding: response.data[0].embedding,
    tokenCount: response.usage.total_tokens,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<Array<{
  embedding: number[];
  tokenCount: number;
}>> {
  // Process in smaller batches to avoid rate limits
  const results: Array<{ embedding: number[]; tokenCount: number }> = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const truncatedBatch = batch.map(text => truncateText(text, MAX_TOKENS));
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedBatch,
    });

    results.push(
      ...response.data.map((item, index) => ({
        embedding: item.embedding,
        tokenCount: response.usage.total_tokens / batch.length, // Approximate per-text token count
      }))
    );
  }

  return results;
}

/**
 * Generate embeddings for documentation pages that don't have them
 */
export async function generateMissingEmbeddings(limit: number = 1000): Promise<{
  processed: number;
  failed: number;
  totalCost: number;
}> {
  console.log(`[Embeddings] Starting generation for up to ${limit} pages...`);
  
  // Get pages without embeddings
  const { data: pages, error } = await supabase
    .from('documentation_pages')
    .select('id, title, content')
    .is('embedding', null)
    .limit(limit);

  if (error) {
    console.error('[Embeddings] Error fetching pages:', error);
    throw error;
  }

  if (!pages || pages.length === 0) {
    console.log('[Embeddings] No pages need embeddings!');
    return { processed: 0, failed: 0, totalCost: 0 };
  }

  console.log(`[Embeddings] Found ${pages.length} pages without embeddings`);

  let processed = 0;
  let failed = 0;
  let totalTokens = 0;

  // Process in batches
  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    console.log(`[Embeddings] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pages.length / BATCH_SIZE)}`);

    try {
      // Generate embeddings for batch
      const texts = batch.map(page => 
        `${page.title}\n\n${page.content}`.trim()
      );
      
      const embeddings = await generateEmbeddingsBatch(texts);

      // Update database
      const updates = batch.map((page, index) => ({
        id: page.id,
        embedding: JSON.stringify(embeddings[index].embedding), // Store as JSON string for PostgreSQL
        embedding_model: EMBEDDING_MODEL,
        embedding_generated_at: new Date().toISOString(),
        embedding_token_count: Math.round(embeddings[index].tokenCount),
      }));

      // Update in parallel (but limit concurrency)
      const updatePromises = updates.map(update => 
        supabase
          .from('documentation_pages')
          .update({
            embedding: update.embedding,
            embedding_model: update.embedding_model,
            embedding_generated_at: update.embedding_generated_at,
            embedding_token_count: update.embedding_token_count,
          })
          .eq('id', update.id)
      );

      const results = await Promise.all(updatePromises);
      
      // Count successes and failures
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`[Embeddings] Failed to update page ${updates[index].id}:`, result.error);
          failed++;
        } else {
          processed++;
          totalTokens += updates[index].embedding_token_count;
        }
      });

    } catch (error: any) {
      console.error('[Embeddings] Batch processing error:', error);
      failed += batch.length;
    }

    // Rate limiting delay (avoid OpenAI rate limits)
    if (i + BATCH_SIZE < pages.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
    }
  }

  // Calculate cost (text-embedding-3-small: $0.00002 per 1K tokens)
  const totalCost = (totalTokens / 1000) * 0.00002;

  console.log(`[Embeddings] Complete! Processed: ${processed}, Failed: ${failed}, Cost: $${totalCost.toFixed(4)}`);

  return { processed, failed, totalCost };
}

/**
 * Regenerate embeddings for all pages (use with caution!)
 */
export async function regenerateAllEmbeddings(): Promise<{
  processed: number;
  failed: number;
  totalCost: number;
}> {
  console.log('[Embeddings] WARNING: Regenerating ALL embeddings...');
  
  // Clear existing embeddings
  await supabase
    .from('documentation_pages')
    .update({ 
      embedding: null,
      embedding_generated_at: null,
      embedding_token_count: null
    })
    .not('id', 'is', null);

  // Generate new embeddings
  return generateMissingEmbeddings(100000); // Process all pages
}

/**
 * Get embedding generation statistics
 */
export async function getEmbeddingStats(): Promise<{
  totalPages: number;
  embeddedPages: number;
  coveragePercent: number;
  avgTokenCount: number;
  estimatedCost: number;
}> {
  const { data, error } = await supabase.rpc('get_embedding_stats');

  if (error) {
    console.error('[Embeddings] Error getting stats:', error);
    throw error;
  }

  const totals = data.reduce((acc: any, row: any) => ({
    total_pages: acc.total_pages + (row.total_pages || 0),
    embedded_pages: acc.embedded_pages + (row.embedded_pages || 0),
    total_tokens: acc.total_tokens + ((row.embedded_pages || 0) * (row.avg_token_count || 0)),
  }), { total_pages: 0, embedded_pages: 0, total_tokens: 0 });

  const coveragePercent = totals.total_pages > 0 
    ? (totals.embedded_pages / totals.total_pages) * 100 
    : 0;

  const avgTokenCount = totals.embedded_pages > 0 
    ? totals.total_tokens / totals.embedded_pages 
    : 0;

  // Estimate cost (text-embedding-3-small: $0.00002 per 1K tokens)
  const estimatedCost = (totals.total_tokens / 1000) * 0.00002;

  return {
    totalPages: totals.total_pages,
    embeddedPages: totals.embedded_pages,
    coveragePercent: Math.round(coveragePercent * 100) / 100,
    avgTokenCount: Math.round(avgTokenCount),
    estimatedCost: Math.round(estimatedCost * 10000) / 10000,
  };
}

/**
 * Truncate text to maximum token count (approximate)
 */
function truncateText(text: string, maxTokens: number): string {
  // Approximate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.substring(0, maxChars) + '...';
}

/**
 * Query analysis: Detect intent, topics, and languages from user query
 */
export async function analyzeQuery(queryText: string): Promise<{
  intent: 'how-to' | 'explanation' | 'reference' | 'troubleshooting' | 'comparison' | null;
  complexity: 'simple' | 'moderate' | 'complex';
  topics: string[];
  languages: string[];
}> {
  // Simple rule-based analysis (can be enhanced with ML later)
  const lowerQuery = queryText.toLowerCase();
  
  // Detect intent
  let intent: any = null;
  if (lowerQuery.includes('how to') || lowerQuery.includes('how do i') || lowerQuery.includes('how can')) {
    intent = 'how-to';
  } else if (lowerQuery.includes('what is') || lowerQuery.includes('what are') || lowerQuery.includes('explain')) {
    intent = 'explanation';
  } else if (lowerQuery.includes('vs') || lowerQuery.includes('versus') || lowerQuery.includes('compare') || lowerQuery.includes('difference between')) {
    intent = 'comparison';
  } else if (lowerQuery.includes('error') || lowerQuery.includes('not working') || lowerQuery.includes('fix') || lowerQuery.includes('debug')) {
    intent = 'troubleshooting';
  } else if (lowerQuery.split(' ').length <= 3) {
    intent = 'reference';
  }

  // Detect complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (queryText.length > 100 || queryText.split(' ').length > 15) {
    complexity = 'complex';
  } else if (queryText.length > 50 || queryText.split(' ').length > 8) {
    complexity = 'moderate';
  }

  // Detect programming languages
  const languages: string[] = [];
  const languageKeywords = [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'scala', 'html', 'css', 'sql'
  ];
  languageKeywords.forEach(lang => {
    if (lowerQuery.includes(lang)) {
      languages.push(lang);
    }
  });

  // Detect topics/technologies
  const topics: string[] = [];
  const topicKeywords = [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'node.js', 'express',
    'django', 'flask', 'fastapi', 'postgresql', 'mongodb', 'redis',
    'docker', 'kubernetes', 'aws', 'git', 'webpack', 'vite', 'babel'
  ];
  topicKeywords.forEach(topic => {
    if (lowerQuery.includes(topic)) {
      topics.push(topic);
    }
  });

  return { intent, complexity, topics, languages };
}
