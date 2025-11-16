# Javari AI - Phase 2 Intelligence Layer

**Autonomous Learning System with Semantic Search**

Complete implementation of Javari AI's autonomous learning capabilities including semantic search, query analysis, content gap detection, and self-improvement metrics.

---

## 🎯 What This Does

This system transforms Javari from a static AI assistant into a continuously learning platform that:

✅ **Semantic Search** - Find relevant documentation using AI embeddings (not just keywords)  
✅ **Query Analysis** - Automatically classify user intent, complexity, topics  
✅ **Content Gap Detection** - Identify missing knowledge areas from failed queries  
✅ **Learning Metrics** - Track resolution rates, satisfaction, coverage  
✅ **Auto-Improvement** - Self-healing system that learns from every interaction  

---

## 📊 Features

### 1. Semantic Search Engine
- Vector similarity search using OpenAI embeddings
- Hybrid search (semantic + full-text)
- Configurable match thresholds
- Source filtering

### 2. Query Analysis Pipeline
- Intent classification (how-to, explanation, reference, troubleshooting, comparison)
- Complexity detection (simple, moderate, complex)
- Topic/technology extraction
- Programming language detection

### 3. Learning Dashboard
- Real-time metrics visualization
- Query volume and resolution trends
- Intent distribution analysis
- Content gap tracking
- Embedding coverage stats

### 4. Autonomous Improvement
- Automatic content gap detection
- Failed query tracking
- Self-healing triggers
- Priority-based gap resolution

---

## 🚀 Quick Start

### Prerequisites

1. ✅ Phase 1 database schema deployed
2. ✅ All 3 scrapers deployed (DevDocs, MDN, FreeCodeCamp)
3. ✅ Supabase project with service role key
4. ✅ OpenAI API key

### Installation

```bash
# 1. Clone/navigate to project
cd javari-intelligence-layer

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env.local

# 4. Add your credentials
NEXT_PUBLIC_SUPABASE_URL=https://kteobfyferrukqeolofj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-api-key
```

### Database Setup

```bash
# Run Phase 2 schema in Supabase SQL Editor
# File: phase2_semantic_search_schema.sql
```

This adds:
- pgvector extension
- user_queries table
- content_gaps table
- 8 search functions
- 3 dashboard views
- 2 auto-improvement triggers

### Local Development

```bash
npm run dev
# Open http://localhost:3000
```

### Deploy to Vercel

```bash
# Via GitHub (recommended)
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

# Or via CLI
vercel --prod
```

---

## 📡 API Endpoints

### 1. Generate Embeddings

**POST `/api/generate-embeddings`**

Generate embeddings for documentation pages that don't have them.

```bash
curl -X POST https://your-app.vercel.app/api/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000}'
```

**Response:**
```json
{
  "success": true,
  "processed": 847,
  "failed": 0,
  "totalCost": 0.1234,
  "message": "Generated embeddings for 847 pages"
}
```

**GET `/api/generate-embeddings`**

Get embedding statistics.

```bash
curl https://your-app.vercel.app/api/generate-embeddings
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPages": 1250,
    "embeddedPages": 847,
    "coveragePercent": 67.76,
    "avgTokenCount": 1543,
    "estimatedCost": 0.1234
  }
}
```

---

### 2. Analyze Query & Search

**POST `/api/analyze-query`**

Analyze a user query and perform semantic search.

```bash
curl -X POST https://your-app.vercel.app/api/analyze-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I use React hooks?",
    "searchType": "hybrid",
    "matchCount": 10,
    "trackQuery": true
  }'
```

**Request Parameters:**
- `query` (string, required) - User's search query
- `searchType` (string) - "semantic", "hybrid", or "fulltext" (default: "hybrid")
- `matchThreshold` (number) - Minimum similarity score 0-1 (default: 0.7)
- `matchCount` (number) - Number of results to return (default: 10)
- `sourceIds` (array) - Filter by specific knowledge source IDs
- `trackQuery` (boolean) - Save query for learning (default: true)
- `sessionId` (string) - User session ID
- `userId` (string) - User ID
- `conversationId` (string) - Conversation ID

**Response:**
```json
{
  "success": true,
  "query": {
    "text": "How do I use React hooks?",
    "analysis": {
      "intent": "how-to",
      "complexity": "simple",
      "topics": ["react", "hooks"],
      "languages": ["javascript"]
    },
    "queryId": "uuid"
  },
  "search": {
    "method": "hybrid",
    "resultCount": 10,
    "responseTime": 245,
    "foundInDocs": true
  },
  "results": [
    {
      "page_id": "uuid",
      "title": "React Hooks Overview",
      "url": "https://react.dev/reference/react",
      "content": "...",
      "source_name": "react",
      "similarity": 0.92
    }
  ]
}
```

**GET `/api/analyze-query?query=text&limit=10`**

Find similar past queries.

---

### 3. Learning Metrics

**GET `/api/metrics?range=24h`**

Get comprehensive learning metrics for dashboard.

```bash
curl https://your-app.vercel.app/api/metrics?range=24h
```

**Query Parameters:**
- `range` - "1h", "24h", "7d", "30d", "90d" (default: "24h")

**Response:**
```json
{
  "success": true,
  "timeRange": "24h",
  "metrics": {
    "overview": {
      "resolution_rate_24h": 87.5,
      "avg_satisfaction_24h": 4.2,
      "embedding_coverage_pct": 68.4,
      "open_gaps": 12,
      "critical_gaps": 2
    },
    "contentGaps": [...],
    "intentAnalysis": [...],
    "embeddingStats": [...],
    "recentQueries": [...]
  }
}
```

**POST `/api/metrics`**

Update query feedback.

```bash
curl -X POST https://your-app.vercel.app/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "queryId": "uuid",
    "satisfaction": 5,
    "feedback": "Very helpful!",
    "wasHelpful": true
  }'
```

---

## 🔄 Automated Tasks

### Embedding Generation (Cron)

Set up automatic embedding generation in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/generate-embeddings",
    "schedule": "0 2 * * *"
  }]
}
```

This runs daily at 2 AM UTC to generate embeddings for new pages.

### Cost Estimation

**Text-embedding-3-small pricing:** $0.00002 per 1K tokens

Example costs:
- 1,000 pages × 1,500 tokens avg = 1.5M tokens = **$0.03**
- 10,000 pages × 1,500 tokens avg = 15M tokens = **$0.30**
- 100,000 pages × 1,500 tokens avg = 150M tokens = **$3.00**

**Recommended:** Start with 1,000 pages, verify quality, then scale up.

---

## 📈 Dashboard Features

Access the dashboard at: `https://your-app.vercel.app/`

### Overview Cards
- Query Resolution Rate (24h)
- Average User Satisfaction
- Embedding Coverage %
- Content Gaps Count

### Charts
- Query Volume Over Time (line chart)
- Query Intent Distribution (bar chart)

### Tables
- Top Content Gaps (priority, frequency, similarity)
- Embedding Coverage by Source
- Recent Queries (with intent, topics, results)

### Controls
- Time Range Selector (1h, 24h, 7d, 30d, 90d)
- Manual Refresh Button
- Auto-refresh every 30 seconds

---

## 🧪 Testing

### 1. Test Semantic Search

```bash
# Test with a real query
curl -X POST http://localhost:3000/api/analyze-query \
  -H "Content-Type: application/json" \
  -d '{"query": "How to use useState in React?"}'
```

**Expected:**
- Intent: "how-to"
- Topics: ["react", "usestate"]
- Results: React documentation pages
- Similarity scores > 0.7

### 2. Test Embedding Generation

```bash
# Generate embeddings for first 100 pages
curl -X POST http://localhost:3000/api/generate-embeddings \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

**Expected:**
- Processed: ~100 pages
- Failed: 0
- Cost: ~$0.003
- Time: ~30-60 seconds

### 3. Test Dashboard

1. Open `http://localhost:3000`
2. Verify overview stats load
3. Check time range selector works
4. Submit a few test queries via API
5. Refresh dashboard to see new queries appear

### 4. Test Content Gap Detection

```bash
# Submit queries that won't find results
curl -X POST http://localhost:3000/api/analyze-query \
  -H "Content-Type: application/json" \
  -d '{"query": "How to build quantum computers with blockchain?"}'

# Check for new content gap
curl http://localhost:3000/api/metrics
# Look in metrics.contentGaps array
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://kteobfyferrukqeolofj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...

# Optional
NEXT_PUBLIC_APP_URL=https://javari-intelligence.vercel.app
```

### Search Configuration

Edit `lib/embeddings.ts`:

```typescript
const EMBEDDING_MODEL = 'text-embedding-3-small'; // or 'text-embedding-3-large'
const BATCH_SIZE = 100; // Embeddings per batch
const MAX_TOKENS = 8000; // Max content tokens
```

### Analysis Configuration

Edit `lib/embeddings.ts` → `analyzeQuery()`:

```typescript
// Add custom intent patterns
if (lowerQuery.includes('your-pattern')) {
  intent = 'your-intent';
}

// Add custom topic keywords
const topicKeywords = [
  'react', 'vue', 'angular', 
  'your-topic' // Add here
];
```

---

## 📊 Database Schema

### New Tables

#### `user_queries`
Tracks all user queries for analysis and learning.

**Key fields:**
- `query_text` - The user's query
- `query_embedding` - Vector embedding
- `query_intent` - Classified intent
- `detected_topics` - Extracted topics
- `found_in_docs` - Whether results were found
- `top_similarity_score` - Best match score
- `user_satisfaction` - 1-5 rating

#### `content_gaps`
Tracks knowledge gaps detected from failed queries.

**Key fields:**
- `topic` - The missing topic
- `query_frequency` - How often requested
- `priority` - low/medium/high/critical
- `status` - identified/planned/in_progress/resolved
- `example_queries` - Sample failed queries

### New Functions

- `search_documentation_semantic()` - Semantic search
- `search_documentation_hybrid()` - Hybrid search
- `find_similar_queries()` - Query clustering
- `detect_content_gaps()` - Gap analysis
- `calculate_query_resolution_rate()` - Metrics
- `calculate_avg_satisfaction()` - Metrics
- `get_embedding_stats()` - Coverage stats

### New Views

- `learning_dashboard` - Real-time overview
- `top_content_gaps` - Priority gaps
- `query_intent_analysis` - Intent breakdown

---

## 🚨 Troubleshooting

### Issue: Embeddings not generating

**Check:**
```bash
# Verify OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check Supabase connection
curl "https://kteobfyferrukqeolofj.supabase.co/rest/v1/documentation_pages?select=id&limit=1" \
  -H "apikey: YOUR_ANON_KEY"
```

**Solution:** Verify environment variables in Vercel dashboard.

### Issue: Search returns no results

**Check:**
```sql
-- Verify embeddings exist
SELECT COUNT(*) FROM documentation_pages WHERE embedding IS NOT NULL;

-- Verify pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Solution:** Run Phase 2 SQL schema, generate embeddings.

### Issue: Dashboard shows no data

**Check:**
```bash
# Test metrics API
curl http://localhost:3000/api/metrics

# Test query API
curl -X POST http://localhost:3000/api/analyze-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

**Solution:** Submit test queries, refresh dashboard.

---

## 📈 Performance

### Expected Metrics

**Embedding Generation:**
- Speed: 100 pages/minute
- Cost: $0.00003 per page (avg 1500 tokens)
- Storage: ~6 KB per embedding

**Semantic Search:**
- Latency: <200ms for 10 results
- Throughput: 1000 queries/minute
- Accuracy: 85-95% (vs keyword search 60-70%)

**Database:**
- user_queries growth: ~1000 rows/day (active usage)
- content_gaps growth: ~10 rows/week (new topics)
- Retention: 90 days (auto-cleanup)

### Optimization Tips

1. **Batch Processing:** Generate embeddings in batches of 100
2. **Caching:** Cache frequent queries (add Redis layer)
3. **Indexes:** Ensure HNSW indexes are built (automatic)
4. **Rate Limiting:** Respect OpenAI rate limits (3500 RPM)

---

## 🔐 Security

### API Security

- Service role key used only server-side (never in browser)
- Row Level Security (RLS) enabled on all tables
- Query tracking respects user privacy (anonymizable)

### Data Privacy

- No PII collected by default
- User IDs optional and anonymized
- Queries retained for 90 days (configurable)
- GDPR-compliant data deletion

### Best Practices

```typescript
// Don't expose service role key
❌ const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Use anon key for client-side
✅ const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

---

## 🎯 Next Steps

### Phase 2.5: Advanced Features

1. **Query Clustering** - Group similar queries
2. **Auto-Suggestions** - Recommend better queries
3. **Multi-Language** - Embeddings for non-English
4. **A/B Testing** - Test search algorithm improvements

### Phase 3: Full Automation

1. **Auto-Scraping** - Detect and scrape new sources
2. **Auto-Resolution** - Automatically fill content gaps
3. **Self-Tuning** - Optimize search parameters
4. **Predictive Analytics** - Forecast future gaps

---

## 📝 License

Internal - CR AudioViz AI, LLC

---

## 🤝 Support

**Questions?** Check documentation:
- Database Schema: `phase2_semantic_search_schema.sql`
- Full System Docs: `JAVARI_AUTONOMOUS_LEARNING_SYSTEM_COMPLETE.md`

**Issues?** Review troubleshooting section above.

---

**Built with Henderson Standard - Fortune 50 Quality**

*Autonomous Learning System - Phase 2 Complete*
