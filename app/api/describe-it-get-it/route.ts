// =====================================================
// JAVARI "DESCRIBE IT, GET IT" ENGINE
// Created: November 16, 2025 - 5:35 PM EST
// Purpose: Natural language → Product mockup → Supplier routing
// Example: "I want a hoodie with a melting candy that says 'melts in your mouth and in your hands'"
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface DescribeItRequest {
  description: string;
  userId?: string;
  userEmail?: string;
}

interface ParsedRequest {
  productType: string;
  sloganText: string;
  designElements: string[];
  colors: string[];
  size?: string;
  tone: string;
  urgency: 'low' | 'medium' | 'high';
}

interface ProductOption {
  product_id: string;
  sku: string;
  title: string;
  mockup_url: string;
  price: number;
  supplier: {
    name: string;
    production_days: number;
    shipping_days: number;
    total_days: number;
    quality_score: number;
  };
  variants: Array<{
    size?: string;
    color?: string;
    price: number;
  }>;
  legal_status: 'approved' | 'pending' | 'flagged';
}

// =====================================================
// PARSE USER DESCRIPTION USING AI
// =====================================================

async function parseDescription(description: string): Promise<ParsedRequest> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are a product request parser. Extract structured information from user descriptions.
        
Available product types: t-shirt, hoodie, tank-top, long-sleeve, baseball-cap, coffee-mug, water-bottle, travel-mug, sticker, magnet, keychain, phone-case, tote-bag, pillow, coaster-set, notebook

Return JSON with:
{
  "productType": "t-shirt" (slug format),
  "sloganText": "exact text to print",
  "designElements": ["melting candy", "hand graphic"],
  "colors": ["red", "white"],
  "size": "L" (if specified),
  "tone": "funny|bold|inspirational|political|sarcastic|patriotic",
  "urgency": "low|medium|high"
}`
      },
      {
        role: 'user',
        content: description
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });
  
  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  
  // Validate and set defaults
  return {
    productType: parsed.productType || 't-shirt',
    sloganText: parsed.sloganText || description,
    designElements: parsed.designElements || [],
    colors: parsed.colors || ['black'],
    size: parsed.size,
    tone: parsed.tone || 'bold',
    urgency: parsed.urgency || 'medium'
  };
}

// =====================================================
// CHECK IF SLOGAN ALREADY EXISTS
// =====================================================

async function findOrCreateSlogan(parsed: ParsedRequest): Promise<string> {
  // Check if slogan exists
  const { data: existing } = await supabase
    .from('generated_slogans')
    .select('id, legal_status')
    .eq('slogan_text', parsed.sloganText)
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // Create new slogan
  const { data: slogan, error } = await supabase
    .from('generated_slogans')
    .insert({
      source_type: 'user_prompt',
      user_prompt: parsed.sloganText,
      slogan_text: parsed.sloganText,
      tone: parsed.tone,
      urgency_score: parsed.urgency === 'high' ? 8 : parsed.urgency === 'medium' ? 5 : 3,
      themes: parsed.designElements,
      suitable_occasions: ['evergreen'],
      legal_status: 'pending'
    })
    .select('id')
    .single();
  
  if (error) throw error;
  
  // Trigger legal compliance check
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/legal-compliance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: parsed.sloganText,
      checkType: 'slogan',
      sourceId: slogan.id
    })
  });
  
  return slogan.id;
}

// =====================================================
// GENERATE MOCKUP USING AI
// =====================================================

async function generateMockup(parsed: ParsedRequest): Promise<string> {
  // For MVP, use DALL-E 3 to generate product mockup
  const prompt = `A professional product mockup of a ${parsed.productType} with the text "${parsed.sloganText}" prominently displayed. 
Design elements: ${parsed.designElements.join(', ')}. 
Colors: ${parsed.colors.join(', ')}. 
Style: ${parsed.tone}, clean, modern, high-quality commercial product photography.
Background: white studio background.
No people in image.`;
  
  try {
    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1
    });
    
    return image.data?.[0]?.url || '';
  } catch (error) {
    console.error('Mockup generation error:', error);
    // Fallback to placeholder
    return `https://via.placeholder.com/500x500.png?text=${encodeURIComponent(parsed.sloganText)}`;
  }
}

// =====================================================
// FIND OR CREATE PRODUCT
// =====================================================

async function findOrCreateProduct(
  sloganId: string,
  parsed: ParsedRequest,
  mockupUrl: string
): Promise<string> {
  // Get product type
  const { data: productType } = await supabase
    .from('product_types')
    .select('*')
    .eq('slug', parsed.productType)
    .single();
  
  if (!productType) {
    throw new Error(`Product type "${parsed.productType}" not found`);
  }
  
  // Check if product already exists for this slogan + type
  const { data: existing } = await supabase
    .from('generated_products')
    .select('id')
    .eq('slogan_id', sloganId)
    .eq('product_type_id', productType.id)
    .single();
  
  if (existing) {
    return existing.id;
  }
  
  // Create new product
  const sku = `${parsed.productType.toUpperCase()}-${sloganId.split('-')[0]}`;
  
  const { data: product, error } = await supabase
    .from('generated_products')
    .insert({
      slogan_id: sloganId,
      product_type_id: productType.id,
      sku,
      title: `${productType.name} - ${parsed.sloganText}`,
      description: `Custom ${productType.name} featuring "${parsed.sloganText}"`,
      mockup_url: mockupUrl,
      design_data: {
        colors: parsed.colors,
        elements: parsed.designElements,
        tone: parsed.tone
      },
      base_cost: productType.base_cost,
      price: productType.base_price,
      margin_amount: productType.base_price - productType.base_cost,
      variant_data: {
        sizes: productType.available_sizes,
        colors: parsed.colors
      },
      is_active: true,
      published_at: new Date().toISOString()
    })
    .select('id')
    .single();
  
  if (error) throw error;
  
  return product.id;
}

// =====================================================
// GET SUPPLIER OPTIONS
// =====================================================

async function getSupplierOptions(
  productId: string,
  productTypeId: string
): Promise<any[]> {
  // Get all partners that support this product type
  const { data: partners } = await supabase
    .from('pod_partners')
    .select(`
      id,
      name,
      slug,
      pricing_tier,
      average_production_days,
      average_shipping_days,
      quality_score,
      partner_product_catalog!inner(
        base_cost,
        shipping_cost,
        production_time_days
      )
    `)
    .contains('supported_product_types', [productTypeId])
    .eq('is_active', true)
    .eq('partner_product_catalog.product_type_id', productTypeId);
  
  if (!partners || partners.length === 0) {
    return [{
      name: 'Standard Supplier',
      production_days: 3,
      shipping_days: 5,
      total_days: 8,
      quality_score: 4.5,
      cost: 0,
      tier: 'standard'
    }];
  }
  
  return partners.map(p => ({
    id: p.id,
    name: p.name,
    production_days: p.average_production_days || 3,
    shipping_days: p.average_shipping_days || 5,
    total_days: (p.average_production_days || 3) + (p.average_shipping_days || 5),
    quality_score: p.quality_score || 4.5,
    cost: p.partner_product_catalog?.[0]?.base_cost || 0,
    tier: p.pricing_tier
  }));
}

// =====================================================
// BUILD PRODUCT OPTIONS
// =====================================================

async function buildProductOptions(
  productId: string,
  parsed: ParsedRequest
): Promise<ProductOption[]> {
  const { data: product } = await supabase
    .from('generated_products')
    .select(`
      *,
      product_types(*),
      generated_slogans(legal_status)
    `)
    .eq('id', productId)
    .single();
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  const suppliers = await getSupplierOptions(productId, product.product_type_id);
  
  // Sort suppliers: fastest first, then cheapest
  suppliers.sort((a, b) => {
    if (parsed.urgency === 'high') {
      return a.total_days - b.total_days; // Fastest first
    }
    return a.cost - b.cost; // Cheapest first
  });
  
  // Return options for each supplier
  return suppliers.map(supplier => ({
    product_id: product.id,
    sku: product.sku,
    title: product.title,
    mockup_url: product.mockup_url || '',
    price: product.price,
    supplier: {
      name: supplier.name,
      production_days: supplier.production_days,
      shipping_days: supplier.shipping_days,
      total_days: supplier.total_days,
      quality_score: supplier.quality_score
    },
    variants: (product.product_types.available_sizes || []).map((size: string) => ({
      size,
      color: parsed.colors[0],
      price: product.price
    })),
    legal_status: product.generated_slogans.legal_status
  }));
}

// =====================================================
// MAIN API HANDLER
// =====================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DescribeItRequest = await request.json();
    
    if (!body.description || body.description.length < 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'Please provide a detailed product description (at least 10 characters)' 
      }, { status: 400 });
    }
    
    console.log(`🎨 Processing: "${body.description}"`);
    const startTime = Date.now();
    
    // STEP 1: Parse description using AI
    console.log('  → Parsing description...');
    const parsed = await parseDescription(body.description);
    console.log(`  ✓ Parsed: ${parsed.productType} with "${parsed.sloganText}"`);
    
    // STEP 2: Find or create slogan (with legal check)
    console.log('  → Creating/finding slogan...');
    const sloganId = await findOrCreateSlogan(parsed);
    console.log(`  ✓ Slogan ID: ${sloganId}`);
    
    // STEP 3: Generate mockup
    console.log('  → Generating mockup...');
    const mockupUrl = await generateMockup(parsed);
    console.log(`  ✓ Mockup generated`);
    
    // STEP 4: Create product
    console.log('  → Creating product...');
    const productId = await findOrCreateProduct(sloganId, parsed, mockupUrl);
    console.log(`  ✓ Product ID: ${productId}`);
    
    // STEP 5: Get supplier options
    console.log('  → Finding suppliers...');
    const options = await buildProductOptions(productId, parsed);
    console.log(`  ✓ Found ${options.length} supplier options`);
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      result: {
        parsed,
        sloganId,
        productId,
        options,
        processing_time_ms: duration
      }
    });
    
  } catch (error: any) {
    console.error('Describe It, Get It error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// =====================================================
// GET USER'S PAST REQUESTS
// =====================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    
    if (!userId && !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId or email required' 
      }, { status: 400 });
    }
    
    // Get user's slogans from prompts
    const { data: slogans } = await supabase
      .from('generated_slogans')
      .select(`
        *,
        generated_products(*)
      `)
      .eq('source_type', 'user_prompt')
      .order('created_at', { ascending: false })
      .limit(20);
    
    return NextResponse.json({
      success: true,
      history: slogans || []
    });
    
  } catch (error: any) {
    console.error('Get history error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
