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
      code_snippet,
      language,
      task_description,
      success,
      error_message,
      execution_time
    } = req.body;

    if (!code_snippet || !language || !task_description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Analyze code patterns
    const analysis = analyzeCode(code_snippet, language, success, error_message);

    // Store learning
    const { data, error } = await supabase
      .from('javari_learning_stats')
      .insert({
        learning_type: 'code',
        pattern_detected: analysis.pattern,
        confidence: analysis.confidence,
        metadata: {
          language,
          task_description,
          success,
          error_message: error_message || null,
          execution_time: execution_time || null,
          code_length: code_snippet.length,
          patterns_found: analysis.details,
          timestamp: new Date().toISOString()
        }
      });

    if (error) {
      console.error('Code learning storage error:', error);
      return res.status(500).json({ error: 'Failed to store learning' });
    }

    return res.status(200).json({
      success: true,
      patterns_learned: analysis.details.length,
      confidence: analysis.confidence,
      recommendations: analysis.recommendations
    });

  } catch (error) {
    console.error('Code learning error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function analyzeCode(code, language, success, errorMessage) {
  const patterns = [];
  const recommendations = [];
  let totalConfidence = 0;

  // Pattern 1: Async usage
  const hasAsync = code.includes('async') || code.includes('await');
  if (hasAsync) {
    patterns.push({
      type: 'async_pattern',
      value: true,
      confidence: 0.95
    });
    totalConfidence += 0.95;
    
    if (!success && errorMessage?.includes('await')) {
      recommendations.push('Consider promise handling and error catching in async operations');
    }
  }

  // Pattern 2: Error handling
  const hasTryCatch = code.includes('try') && code.includes('catch');
  const hasErrorCheck = code.includes('if') && code.includes('error');
  if (hasTryCatch || hasErrorCheck) {
    patterns.push({
      type: 'error_handling',
      value: true,
      confidence: 0.9
    });
    totalConfidence += 0.9;
  } else if (!success) {
    recommendations.push('Add error handling with try-catch blocks');
  }

  // Pattern 3: API calls
  const hasApiCall = code.includes('fetch') || code.includes('axios') || code.includes('http');
  if (hasApiCall) {
    patterns.push({
      type: 'api_call',
      value: true,
      confidence: 0.92
    });
    totalConfidence += 0.92;
    
    if (!success) {
      recommendations.push('Verify API endpoints and add timeout handling');
    }
  }

  // Pattern 4: Database operations
  const hasDbOp = code.includes('supabase') || 
                  code.includes('SELECT') || 
                  code.includes('INSERT') ||
                  code.includes('.from(');
  if (hasDbOp) {
    patterns.push({
      type: 'database_operation',
      value: true,
      confidence: 0.93
    });
    totalConfidence += 0.93;
    
    if (!success && errorMessage) {
      recommendations.push('Check database permissions and query syntax');
    }
  }

  // Pattern 5: React hooks
  const hasReactHooks = code.includes('useState') || 
                        code.includes('useEffect') ||
                        code.includes('useCallback');
  if (hasReactHooks) {
    patterns.push({
      type: 'react_hooks',
      value: true,
      confidence: 0.88
    });
    totalConfidence += 0.88;
    
    if (!success) {
      recommendations.push('Verify hook dependencies and state updates');
    }
  }

  // Pattern 6: TypeScript types
  const hasTypeScript = code.includes('interface') || 
                        code.includes('type ') ||
                        code.includes(': string') ||
                        code.includes(': number');
  if (hasTypeScript && language === 'typescript') {
    patterns.push({
      type: 'typescript_types',
      value: true,
      confidence: 0.94
    });
    totalConfidence += 0.94;
  }

  // Pattern 7: Success/failure tracking
  if (success) {
    patterns.push({
      type: 'successful_execution',
      value: true,
      confidence: 1.0
    });
    totalConfidence += 1.0;
  } else {
    patterns.push({
      type: 'execution_failure',
      value: errorMessage || 'unknown error',
      confidence: 0.8
    });
    totalConfidence += 0.8;
  }

  // Calculate average confidence
  const avgConfidence = patterns.length > 0 
    ? totalConfidence / patterns.length 
    : 0.5;

  return {
    pattern: patterns.length > 0 ? patterns[0].type : 'basic_code',
    confidence: Math.min(avgConfidence, 1.0),
    details: patterns,
    recommendations
  };
}
