/**
 * Javari AI - Phase 2 Intelligence Layer
 * Supabase Client Configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Service role client for server-side operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types
export interface DocumentationPage {
  id: string;
  source_id: string;
  url: string;
  title: string;
  content: string;
  content_hash: string;
  section?: string;
  subsection?: string;
  embedding?: number[];
  embedding_model?: string;
  embedding_generated_at?: string;
  embedding_token_count?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_scraped_at: string;
}

export interface UserQuery {
  id: string;
  query_text: string;
  query_embedding?: number[];
  query_intent?: 'how-to' | 'explanation' | 'reference' | 'troubleshooting' | 'comparison';
  query_complexity?: 'simple' | 'moderate' | 'complex';
  detected_topics?: string[];
  detected_languages?: string[];
  found_in_docs: boolean;
  relevant_page_ids?: string[];
  top_similarity_score?: number;
  response_generated: boolean;
  response_token_count?: number;
  response_time_ms?: number;
  user_satisfaction?: number;
  user_feedback_text?: string;
  was_helpful?: boolean;
  session_id?: string;
  user_id?: string;
  conversation_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ContentGap {
  id: string;
  topic: string;
  subtopics?: string[];
  query_frequency: number;
  first_detected_at: string;
  last_detected_at: string;
  example_queries?: string[];
  failed_query_count: number;
  avg_similarity_score?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_users_affected?: number;
  status: 'identified' | 'planned' | 'in_progress' | 'resolved';
  resolution_plan?: string;
  resolved_at?: string;
  resolved_by_page_ids?: string[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface LearningMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  source_id?: string;
  page_id?: string;
  recorded_at: string;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  page_id: string;
  title: string;
  url: string;
  content: string;
  section?: string;
  source_name: string;
  similarity: number;
  last_updated: string;
}
