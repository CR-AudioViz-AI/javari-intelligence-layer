import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AI/Tech news sources to crawl
const NEWS_SOURCES = [
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/',
    selector: 'article.post-block'
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/ai-artificial-intelligence',
    selector: 'article'
  },
  {
    name: 'MIT Technology Review AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence/',
    selector: 'article'
  }
];

async function crawlNewsSource(sourceConfig) {
  try {
    const response = await fetch(sourceConfig.url);
    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const articles = [];
    $(sourceConfig.selector).each((i, elem) => {
      if (i >= 10) return false; // Limit to 10 articles per source
      
      const $elem = $(elem);
      const title = $elem.find('h2, h3').first().text().trim();
      const link = $elem.find('a').first().attr('href');
      const summary = $elem.find('p').first().text().trim();
      
      if (title && link) {
        articles.push({
          title,
          url: link.startsWith('http') ? link : `${new URL(sourceConfig.url).origin}${link}`,
          summary: summary || title,
          source: sourceConfig.name
        });
      }
    });
    
    return articles;
  } catch (error) {
    console.error(`Error crawling ${sourceConfig.name}:`, error.message);
    return [];
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🚀 News crawler started');
    const startTime = Date.now();
    let totalScraped = 0;
    let totalErrors = 0;

    // Get or create source
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .upsert({
        name: 'AI News Aggregator',
        source_type: 'news',
        base_url: 'https://multiple-sources.com',
        scrape_frequency: 'every_4_hours',
        is_active: true,
        last_scraped_at: new Date().toISOString()
      }, {
        onConflict: 'name'
      })
      .select()
      .single();

    if (sourceError) {
      console.error('Source error:', sourceError);
      return res.status(500).json({ error: 'Failed to create source' });
    }

    console.log(`✅ Source: ${source.name} (ID: ${source.id})`);

    // Crawl all news sources
    for (const sourceConfig of NEWS_SOURCES) {
      try {
        console.log(`\n📰 Crawling: ${sourceConfig.name}`);
        
        const articles = await crawlNewsSource(sourceConfig);
        console.log(`  Found ${articles.length} articles`);
        
        for (const article of articles) {
          try {
            const { error: insertError } = await supabase
              .from('knowledge_content')
              .upsert({
                source_id: source.id,
                title: article.title,
                content_type: 'news',
                url: article.url,
                content: article.summary,
                summary: article.summary.slice(0, 500),
                metadata: {
                  news_source: article.source,
                  crawled_at: new Date().toISOString()
                },
                scraped_at: new Date().toISOString()
              }, {
                onConflict: 'url',
                ignoreDuplicates: true
              });

            if (!insertError) {
              totalScraped++;
            } else if (!insertError.message.includes('duplicate')) {
              console.error(`  ⚠️  Insert error:`, insertError.message);
              totalErrors++;
            }
            
          } catch (error) {
            console.error(`  ❌ Error processing article:`, error.message);
            totalErrors++;
          }
        }
        
        console.log(`  ✅ Completed ${sourceConfig.name}`);
        
        // Rate limiting between sources
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  ❌ Error with ${sourceConfig.name}:`, error.message);
        totalErrors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Update source stats
    await supabase
      .from('knowledge_sources')
      .update({
        last_scraped_at: new Date().toISOString(),
        metadata: {
          last_scrape_duration: duration,
          last_scrape_count: totalScraped,
          last_scrape_errors: totalErrors
        }
      })
      .eq('id', source.id);

    const response = {
      success: true,
      source: 'AI News Aggregator',
      scraped: totalScraped,
      errors: totalErrors,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    };

    console.log('\n✅ News crawling complete:', response);
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
