// =====================================================
// JAVARI LEGAL COMPLIANCE API
// Created: November 16, 2025 - 5:30 PM EST
// Purpose: Trademark, copyright, and defamation checking
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// USPTO Trademark API
const USPTO_API_URL = 'https://tsdr.uspto.gov/api';

interface LegalCheckRequest {
  text: string;
  checkType: 'slogan' | 'product_name' | 'design_element';
  sourceId?: string; // slogan_id or product_id
}

interface LegalCheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresReview: boolean;
  checks: {
    trademark: TrademarkCheck;
    copyright: CopyrightCheck;
    defamation: DefamationCheck;
  };
}

interface TrademarkCheck {
  status: 'clear' | 'potential_conflict' | 'conflict' | 'error';
  conflictingMarks: any[];
  riskLevel: string;
}

interface CopyrightCheck {
  status: 'clear' | 'potential_match' | 'match' | 'error';
  matches: any[];
  riskLevel: string;
}

interface DefamationCheck {
  status: 'clear' | 'flagged';
  flags: string[];
  riskLevel: string;
}

// =====================================================
// TRADEMARK CHECKING (USPTO API)
// =====================================================

async function checkTrademark(text: string): Promise<TrademarkCheck> {
  try {
    // Clean text for search
    const searchText = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    
    // Check if text is too generic
    if (searchText.split(' ').length <= 2 && searchText.length < 10) {
      return {
        status: 'clear',
        conflictingMarks: [],
        riskLevel: 'low'
      };
    }
    
    // USPTO TSDR Search (simplified - use actual API in production)
    // For now, we'll use a basic keyword matching approach
    const suspiciousKeywords = [
      'nike', 'adidas', 'apple', 'microsoft', 'google', 'amazon', 'disney',
      'coca-cola', 'pepsi', 'mcdonalds', 'starbucks', 'walmart', 'target',
      'nfl', 'nba', 'mlb', 'nhl', 'espn', 'olympics'
    ];
    
    const lowerText = text.toLowerCase();
    const conflicts = suspiciousKeywords.filter(keyword => lowerText.includes(keyword));
    
    if (conflicts.length > 0) {
      return {
        status: 'conflict',
        conflictingMarks: conflicts.map(mark => ({
          name: mark,
          owner: 'Known trademark',
          registrationNumber: 'TBD',
          status: 'registered'
        })),
        riskLevel: 'critical'
      };
    }
    
    // Check for common phrase patterns that might be trademarked
    const riskyPatterns = [
      /just do it/i,
      /think different/i,
      /have it your way/i,
      /i'm lovin' it/i,
      /the real thing/i
    ];
    
    const hasRiskyPattern = riskyPatterns.some(pattern => pattern.test(text));
    
    if (hasRiskyPattern) {
      return {
        status: 'potential_conflict',
        conflictingMarks: [{ note: 'Matches known trademarked phrase pattern' }],
        riskLevel: 'high'
      };
    }
    
    return {
      status: 'clear',
      conflictingMarks: [],
      riskLevel: 'low'
    };
    
  } catch (error: any) {
    console.error('Trademark check error:', error);
    return {
      status: 'error',
      conflictingMarks: [],
      riskLevel: 'medium'
    };
  }
}

// =====================================================
// COPYRIGHT CHECKING
// =====================================================

async function checkCopyright(text: string): Promise<CopyrightCheck> {
  try {
    // Check for song lyrics, movie quotes, book excerpts
    const copyrightedPatterns = [
      // Famous song lyrics
      /somebody once told me/i,
      /never gonna give you up/i,
      /don't stop believin'/i,
      
      // Movie quotes
      /may the force be with you/i,
      /i'll be back/i,
      /here's looking at you/i,
      
      // Book quotes
      /it was the best of times/i,
      /call me ishmael/i
    ];
    
    const matches = copyrightedPatterns.filter(pattern => pattern.test(text));
    
    if (matches.length > 0) {
      return {
        status: 'match',
        matches: matches.map(m => ({ pattern: m.toString() })),
        riskLevel: 'critical'
      };
    }
    
    // Check for excessive length (might be copyrighted content)
    if (text.length > 200) {
      return {
        status: 'potential_match',
        matches: [{ note: 'Text length suggests possible copyrighted content' }],
        riskLevel: 'medium'
      };
    }
    
    return {
      status: 'clear',
      matches: [],
      riskLevel: 'low'
    };
    
  } catch (error: any) {
    console.error('Copyright check error:', error);
    return {
      status: 'error',
      matches: [],
      riskLevel: 'medium'
    };
  }
}

// =====================================================
// DEFAMATION CHECKING
// =====================================================

function checkDefamation(text: string): DefamationCheck {
  const flags: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  // Check for named individuals (potential defamation risk)
  const publicFigurePatterns = [
    /biden/i, /trump/i, /obama/i, /clinton/i,
    /musk/i, /bezos/i, /zuckerberg/i, /gates/i
  ];
  
  const mentionsPublicFigure = publicFigurePatterns.some(pattern => pattern.test(text));
  
  if (mentionsPublicFigure) {
    flags.push('mentions_public_figure');
    riskLevel = 'medium';
  }
  
  // Check for potentially defamatory language
  const defamatoryTerms = [
    /\b(liar|thief|criminal|fraud|scam|corrupt)\b/i,
    /\b(hates|racist|bigot|nazi|fascist)\b/i
  ];
  
  const hasDefamatoryTerms = defamatoryTerms.some(pattern => pattern.test(text));
  
  if (hasDefamatoryTerms) {
    flags.push('potentially_defamatory_language');
    riskLevel = mentionsPublicFigure ? 'high' : 'medium';
  }
  
  // Check for hate speech indicators
  const hateSpeechPatterns = [
    /\b(kill|murder|assassinate|attack)\b.*\b(president|senator|congressman|politician)\b/i
  ];
  
  const hasHateSpeech = hateSpeechPatterns.some(pattern => pattern.test(text));
  
  if (hasHateSpeech) {
    flags.push('hate_speech_detected');
    riskLevel = 'high';
  }
  
  return {
    status: flags.length > 0 ? 'flagged' : 'clear',
    flags,
    riskLevel
  };
}

// =====================================================
// COMPREHENSIVE LEGAL CHECK
// =====================================================

async function performLegalCheck(request: LegalCheckRequest): Promise<LegalCheckResult> {
  // Run all checks in parallel
  const [trademark, copyright, defamation] = await Promise.all([
    checkTrademark(request.text),
    checkCopyright(request.text),
    Promise.resolve(checkDefamation(request.text))
  ]);
  
  // Determine overall risk level (highest of all checks)
  const riskLevels = [trademark.riskLevel, copyright.riskLevel, defamation.riskLevel];
  const overallRisk = riskLevels.includes('critical') ? 'critical' :
                      riskLevels.includes('high') ? 'high' :
                      riskLevels.includes('medium') ? 'medium' : 'low';
  
  // Determine if manual review is required
  const requiresReview = 
    overallRisk === 'critical' ||
    overallRisk === 'high' ||
    trademark.status === 'conflict' ||
    copyright.status === 'match' ||
    defamation.flags.length > 0;
  
  const passed = overallRisk === 'low' && !requiresReview;
  
  return {
    passed,
    riskLevel: overallRisk,
    requiresReview,
    checks: {
      trademark,
      copyright,
      defamation
    }
  };
}

// =====================================================
// SAVE CHECK RESULTS TO DATABASE
// =====================================================

async function saveCheckResults(
  request: LegalCheckRequest,
  result: LegalCheckResult
): Promise<void> {
  // Save trademark check
  if (request.checkType === 'slogan') {
    await supabase.from('trademark_checks').insert({
      text_to_check: request.text,
      check_type: request.checkType,
      slogan_id: request.sourceId,
      check_status: result.checks.trademark.status,
      api_response: result.checks.trademark,
      conflicting_marks: result.checks.trademark.conflictingMarks,
      risk_level: result.checks.trademark.riskLevel,
      requires_review: result.requiresReview
    });
    
    await supabase.from('copyright_checks').insert({
      content_to_check: request.text,
      content_type: 'text',
      slogan_id: request.sourceId,
      check_status: result.checks.copyright.status,
      matches_found: result.checks.copyright.matches,
      risk_level: result.checks.copyright.riskLevel,
      requires_review: result.requiresReview
    });
  }
  
  // If requires review, add to approval queue
  if (result.requiresReview) {
    const flagReasons: string[] = [];
    
    if (result.checks.trademark.status !== 'clear') {
      flagReasons.push('trademark_risk');
    }
    if (result.checks.copyright.status !== 'clear') {
      flagReasons.push('copyright_risk');
    }
    if (result.checks.defamation.status === 'flagged') {
      flagReasons.push('defamation_risk');
    }
    
    await supabase.from('approval_queue').insert({
      item_type: request.checkType,
      item_id: request.sourceId,
      flag_reasons: flagReasons,
      risk_level: result.riskLevel,
      automated_flags: result.checks,
      preview_data: { text: request.text },
      status: 'pending',
      priority: result.riskLevel === 'critical' ? 10 :
                result.riskLevel === 'high' ? 7 :
                result.riskLevel === 'medium' ? 4 : 1
    });
    
    // Update slogan status if applicable
    if (request.checkType === 'slogan' && request.sourceId) {
      await supabase
        .from('generated_slogans')
        .update({ 
          legal_status: 'flagged',
          legal_flags: result.checks
        })
        .eq('id', request.sourceId);
    }
  } else {
    // Auto-approve if all clear
    if (request.checkType === 'slogan' && request.sourceId) {
      await supabase
        .from('generated_slogans')
        .update({ 
          legal_status: 'approved',
          legal_reviewed_at: new Date().toISOString()
        })
        .eq('id', request.sourceId);
    }
  }
}

// =====================================================
// API ENDPOINTS
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: LegalCheckRequest = await request.json();
    
    if (!body.text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Text is required' 
      }, { status: 400 });
    }
    
    console.log(`🔍 Checking: "${body.text.substring(0, 50)}..."`);
    
    // Perform legal check
    const result = await performLegalCheck(body);
    
    // Save results to database
    if (body.sourceId) {
      await saveCheckResults(body, result);
    }
    
    console.log(`${result.passed ? '✅' : '⚠️'} Risk: ${result.riskLevel}, Review: ${result.requiresReview}`);
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error: any) {
    console.error('Legal check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// =====================================================
// GET APPROVAL QUEUE
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    
    const { data: queue, error } = await supabase
      .from('approval_queue')
      .select('*')
      .eq('status', status)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      queue: queue || [],
      count: queue?.length || 0
    });
    
  } catch (error: any) {
    console.error('Get approval queue error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// =====================================================
// BULK CHECK ENDPOINT
// =====================================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: { texts: string[]; checkType: string } = await request.json();
    
    if (!body.texts || body.texts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Texts array is required' 
      }, { status: 400 });
    }
    
    const results = await Promise.all(
      body.texts.map(text => 
        performLegalCheck({ 
          text, 
          checkType: body.checkType as any 
        })
      )
    );
    
    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      flagged: results.filter(r => r.requiresReview).length,
      critical: results.filter(r => r.riskLevel === 'critical').length
    };
    
    return NextResponse.json({
      success: true,
      results,
      summary
    });
    
  } catch (error: any) {
    console.error('Bulk check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
