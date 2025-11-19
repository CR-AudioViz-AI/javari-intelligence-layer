# Javari Intelligence Layer

The central nervous system of Javari AI - autonomous learning and intelligence coordination.

## Components

### 1. News Crawler (`/api/cron/web-crawl`)
- **Schedule**: Every 4 hours
- **Sources**: TechCrunch AI, The Verge AI, MIT Tech Review
- **Purpose**: Keep Javari updated on latest AI/tech developments

### 2. Conversation Learning (`/api/learn/conversation`)
- **Trigger**: After every user conversation
- **Purpose**: Extract patterns from user interactions
- **Patterns Detected**:
  - Question types
  - Code requests
  - Debug requests
  - Explanation requests
  - User satisfaction

### 3. Code Learning (`/api/learn/code`)
- **Trigger**: After code generation/execution
- **Purpose**: Track code patterns and success rates
- **Analysis**:
  - Async patterns
  - Error handling
  - API calls
  - Database operations
  - React hooks
  - TypeScript usage
  - Success/failure tracking

### 4. Admin Manual Feed (`/api/admin/feed`)
- **Access**: Admin only
- **Purpose**: Manually add knowledge to Javari
- **Use Cases**:
  - Company-specific information
  - Custom procedures
  - Proprietary knowledge
  - Quick updates

## Architecture

```
┌─────────────────────────────────────────┐
│      JAVARI INTELLIGENCE LAYER          │
└─────────────────────────────────────────┘
              │
    ┌─────────┼─────────┬─────────┐
    │         │         │         │
    ▼         ▼         ▼         ▼
 News    Conversation Code    Admin
Crawler   Learning  Learning   Feed
    │         │         │         │
    └─────────┴─────────┴─────────┘
              │
              ▼
    ┌─────────────────┐
    │    SUPABASE     │
    │  Knowledge DB   │
    └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │   JAVARI AI     │
    │  (RAG Queries)  │
    └─────────────────┘
```

## Database Tables

### knowledge_sources
Tracks all learning sources (DevDocs, MDN, FCC, News, Manual)

### knowledge_content
Stores all learned content with embeddings for RAG

### javari_learning_stats
Tracks patterns and learning metrics

### feed_items
RSS/manual feed items

## API Endpoints

### Cron Jobs
- `POST /api/cron/web-crawl` - News crawler (auth: Bearer CRON_SECRET)

### Learning Hooks
- `POST /api/learn/conversation` - Log conversation learning
- `POST /api/learn/code` - Log code learning

### Admin
- `POST /api/admin/feed` - Manually add knowledge

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://kteobfyferrukqeolofj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=random_secret_string
```

## Deployment

```bash
# Deploy to Vercel
vercel --prod

# Verify cron jobs
curl -X POST https://javari-intelligence-layer.vercel.app/api/cron/web-crawl \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Learning Statistics

Access learning stats via Supabase:

```sql
-- Top patterns learned
SELECT pattern_detected, COUNT(*) as count, AVG(confidence) as avg_confidence
FROM javari_learning_stats
GROUP BY pattern_detected
ORDER BY count DESC
LIMIT 10;

-- Recent learnings
SELECT *
FROM javari_learning_stats
ORDER BY created_at DESC
LIMIT 20;
```

## Integration with Other Systems

### DevDocs Scraper
Provides comprehensive API documentation

### MDN Scraper
Provides web standards and browser API docs

### FCC Scraper
Provides practical tutorials and examples

### Intelligence Layer (this repo)
- Aggregates AI/tech news
- Learns from conversations
- Learns from code
- Accepts manual input

### Javari AI
Queries all this knowledge via RAG to provide informed responses

## Monitoring

Check Vercel logs for:
- ✅ Successful learning events
- 📊 Pattern detection rates
- ⚠️  API errors
- 📈 Growth metrics

## Part of Javari Autonomous System

This intelligence layer coordinates with:
- 9 monitoring bots (CONDUCTOR, SENTINEL, etc.)
- 31 AI avatars
- 60+ professional tools
- Complete CR AudioViz AI ecosystem

---

**Built by Roy Henderson & Claude**  
**CR AudioViz AI, LLC**
