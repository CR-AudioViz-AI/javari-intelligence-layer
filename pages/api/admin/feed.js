import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      title,
      content,
      content_type,
      summary,
      tags
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Get or create manual feed source
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .upsert({
        name: 'Manual Admin Feed',
        source_type: 'manual',
        base_url: 'https://craudiovizai.com/admin',
        is_active: true
      }, {
        onConflict: 'name'
      })
      .select()
      .single();

    if (sourceError) {
      console.error('Source error:', sourceError);
      return res.status(500).json({ error: 'Failed to create source' });
    }

    // Create feed item
    const { data: feedItem, error: feedError } = await supabase
      .from('feed_items')
      .insert({
        source_id: source.id,
        title,
        description: summary || content.slice(0, 500),
        link: `https://craudiovizai.com/admin/feed/${Date.now()}`,
        published_at: new Date().toISOString(),
        tags: tags || []
      })
      .select()
      .single();

    if (feedError) {
      console.error('Feed error:', feedError);
      return res.status(500).json({ error: 'Failed to create feed item' });
    }

    // Store in knowledge content
    const { data: knowledge, error: knowledgeError } = await supabase
      .from('knowledge_content')
      .insert({
        source_id: source.id,
        title,
        content_type: content_type || 'manual',
        url: feedItem.link,
        content,
        summary: summary || content.slice(0, 500),
        metadata: {
          feed_item_id: feedItem.id,
          tags: tags || [],
          manually_added: true,
          added_by: 'admin',
          timestamp: new Date().toISOString()
        },
        scraped_at: new Date().toISOString()
      })
      .select()
      .single();

    if (knowledgeError) {
      console.error('Knowledge error:', knowledgeError);
      return res.status(500).json({ error: 'Failed to store knowledge' });
    }

    return res.status(200).json({
      success: true,
      feed_item: feedItem,
      knowledge_item: knowledge
    });

  } catch (error) {
    console.error('Admin feed error:', error);
    return res.status(500).json({ error: error.message });
  }
}
