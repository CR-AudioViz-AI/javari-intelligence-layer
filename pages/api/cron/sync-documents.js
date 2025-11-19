import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_ORG = 'CR-AudioViz-AI';
const REPO_NAME = 'javari-knowledge-documents';

async function commitToGitHub(filePath, content, commitMessage) {
  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }
  
  try {
    const headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    };

    const getUrl = `https://api.github.com/repos/${GITHUB_ORG}/${REPO_NAME}/contents/${filePath}`;
    const getResponse = await fetch(getUrl, { headers });
    
    let currentSha = null;
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      currentSha = fileData.sha;
    }

    const updateData = {
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      ...(currentSha && { sha: currentSha })
    };

    const putUrl = `https://api.github.com/repos/${GITHUB_ORG}/${REPO_NAME}/contents/${filePath}`;
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData)
    });

    if (!putResponse.ok) {
      const error = await putResponse.text();
      throw new Error(`GitHub API error: ${error}`);
    }

    const result = await putResponse.json();
    return {
      success: true,
      url: result.content.html_url,
      sha: result.content.sha
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function sanitizeFileName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function getFilePath(contentType, sourceType, title, id) {
  const sanitized = sanitizeFileName(title);
  const folder = `${sourceType}/${contentType}`;
  return `${folder}/${sanitized}-${id.slice(0, 8)}.md`;
}

function formatMarkdown(doc) {
  return `# ${doc.title}

**Source:** ${doc.source_name}  
**Type:** ${doc.content_type}  
**URL:** ${doc.url}  
**Scraped:** ${new Date(doc.scraped_at).toISOString()}  
**Document ID:** ${doc.id}

---

## Summary

${doc.summary || 'No summary available'}

---

## Content

${doc.content.slice(0, 10000)}

---

**Metadata:**
\`\`\`json
${JSON.stringify(doc.metadata, null, 2)}
\`\`\`

---

*Automatically version controlled by Javari AI*  
*Last synced: ${new Date().toISOString()}*
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Document sync processor started');
    const startTime = Date.now();
    
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    // Get pending items from queue (limit 20 per run)
    const { data: queueItems, error: queueError } = await supabase
      .from('document_sync_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(20);

    if (queueError) {
      console.error('Queue fetch error:', queueError);
      return res.status(500).json({ error: 'Failed to fetch queue' });
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ No pending documents to sync');
      return res.status(200).json({
        success: true,
        processed: 0,
        succeeded: 0,
        failed: 0
      });
    }

    console.log(`📦 Processing ${queueItems.length} documents`);

    // Process each item
    for (const item of queueItems) {
      totalProcessed++;
      
      try {
        // Mark as processing
        await supabase
          .from('document_sync_queue')
          .update({ status: 'processing' })
          .eq('id', item.id);

        // Get document with source info
        const { data: doc, error: docError } = await supabase
          .from('knowledge_content')
          .select(`
            *,
            knowledge_sources (
              name,
              source_type
            )
          `)
          .eq('id', item.document_id)
          .single();

        if (docError || !doc) {
          throw new Error('Document not found');
        }

        // Format as markdown
        const markdownContent = formatMarkdown({
          ...doc,
          source_name: doc.knowledge_sources.name
        });

        // Determine file path
        const filePath = getFilePath(
          doc.content_type,
          doc.knowledge_sources.source_type,
          doc.title,
          doc.id
        );

        // Commit message
        const commitMessage = item.action === 'update' 
          ? `Update: ${doc.title}`
          : `Add: ${doc.title}`;

        // Commit to GitHub
        const result = await commitToGitHub(filePath, markdownContent, commitMessage);

        if (result.success) {
          // Update document metadata
          await supabase
            .from('knowledge_content')
            .update({
              metadata: {
                ...doc.metadata,
                github_url: result.url,
                github_sha: result.sha,
                last_synced: new Date().toISOString()
              }
            })
            .eq('id', item.document_id);

          // Mark queue item as completed
          await supabase
            .from('document_sync_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          totalSucceeded++;
          console.log(`  ✓ Synced: ${doc.title.slice(0, 50)}`);
        } else {
          throw new Error(result.error);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`  ✗ Failed: ${error.message}`);
        
        // Update queue item with error
        await supabase
          .from('document_sync_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: item.retry_count + 1,
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        totalFailed++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const response = {
      success: true,
      processed: totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    };

    console.log('\n✅ Document sync complete:', response);
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
