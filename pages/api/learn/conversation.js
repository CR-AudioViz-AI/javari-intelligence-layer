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
    const { conversation_id, user_message, ai_response, user_feedback } = req.body;

    if (!conversation_id || !user_message || !ai_response) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract learning patterns
    const patterns = extractPatterns(user_message, ai_response, user_feedback);

    // Store learning
    const { data, error } = await supabase
      .from('javari_learning_stats')
      .insert({
        conversation_id,
        learning_type: 'conversation',
        pattern_detected: patterns.pattern,
        confidence: patterns.confidence,
        metadata: {
          user_message_length: user_message.length,
          ai_response_length: ai_response.length,
          user_feedback: user_feedback || null,
          patterns_found: patterns.details,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Learning storage error:', error);
      return res.status(500).json({ error: 'Failed to store learning' });
    }

    return res.status(200).json({
      success: true,
      patterns_learned: patterns.details.length,
      confidence: patterns.confidence
    });

  } catch (error) {
    console.error('Conversation learning error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function extractPatterns(userMessage, aiResponse, feedback) {
  const patterns = [];
  let totalConfidence = 0;

  // Pattern 1: Question types
  if (userMessage.includes('?')) {
    const questionWords = ['how', 'what', 'why', 'when', 'where', 'who', 'which'];
    const foundWords = questionWords.filter(word => 
      userMessage.toLowerCase().includes(word)
    );
    if (foundWords.length > 0) {
      patterns.push({
        type: 'question_type',
        value: foundWords[0],
        confidence: 0.9
      });
      totalConfidence += 0.9;
    }
  }

  // Pattern 2: Code requests
  const codeIndicators = ['code', 'function', 'implement', 'build', 'create', 'script'];
  const hasCodeRequest = codeIndicators.some(indicator =>
    userMessage.toLowerCase().includes(indicator)
  );
  if (hasCodeRequest) {
    patterns.push({
      type: 'code_request',
      value: true,
      confidence: 0.85
    });
    totalConfidence += 0.85;
  }

  // Pattern 3: Debugging requests
  const debugIndicators = ['error', 'bug', 'fix', 'broken', 'not working', 'issue'];
  const hasDebugRequest = debugIndicators.some(indicator =>
    userMessage.toLowerCase().includes(indicator)
  );
  if (hasDebugRequest) {
    patterns.push({
      type: 'debug_request',
      value: true,
      confidence: 0.88
    });
    totalConfidence += 0.88;
  }

  // Pattern 4: Explanation requests
  const explainIndicators = ['explain', 'understand', 'what is', 'how does', 'tell me about'];
  const hasExplainRequest = explainIndicators.some(indicator =>
    userMessage.toLowerCase().includes(indicator)
  );
  if (hasExplainRequest) {
    patterns.push({
      type: 'explanation_request',
      value: true,
      confidence: 0.92
    });
    totalConfidence += 0.92;
  }

  // Pattern 5: User satisfaction (from feedback)
  if (feedback) {
    patterns.push({
      type: 'user_satisfaction',
      value: feedback,
      confidence: 1.0
    });
    totalConfidence += 1.0;
  }

  // Calculate average confidence
  const avgConfidence = patterns.length > 0 
    ? totalConfidence / patterns.length 
    : 0.5;

  return {
    pattern: patterns.length > 0 ? patterns[0].type : 'general_inquiry',
    confidence: Math.min(avgConfidence, 1.0),
    details: patterns
  };
}
