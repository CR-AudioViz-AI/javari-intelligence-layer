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

    // Get current file SHA if it exists (for updates)
    const getUrl = `https://api.github.com/repos/${GITHUB_ORG}/${REPO_NAME}/contents/${filePath}`;
    const getResponse = await fetch(getUrl, { headers });
    
    let currentSha = null;
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      currentSha = fileData.sha;
    }

    // Create or update file
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
    console.error('GitHub commit error:', error);
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
  return `${folder}/${sanitized}-${id}.md`;
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

${doc.content}

---

**Metadata:**
\`\`\`json
${JSON.stringify(doc.metadata, null, 2)}
\`\`\`

---

*This document is automatically version controlled by Javari AI*  
*Last updated: ${new Date().toISOString()}*
`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { document_id, action } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'document_id required' });
    }

    // Get document from database
    const { data: doc, error: fetchError } = await supabase
      .from('knowledge_content')
      .select(`
        *,
        knowledge_sources (
          name,
          source_type
        )
      `)
      .eq('id', document_id)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
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
    const commitMessage = action === 'update' 
      ? `Update: ${doc.title}`
      : `Add: ${doc.title}`;

    // Commit to GitHub
    const result = await commitToGitHub(filePath, markdownContent, commitMessage);

    if (result.success) {
      // Update document metadata with GitHub info
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
        .eq('id', document_id);

      return res.status(200).json({
        success: true,
        github_url: result.url,
        file_path: filePath,
        action: action || 'add'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Document sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
