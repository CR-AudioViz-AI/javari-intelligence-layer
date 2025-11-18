'use client';

// =====================================================
// JAVARI "DESCRIBE IT, GET IT" UI COMPONENT
// Created: November 16, 2025 - 5:40 PM EST
// Purpose: Beautiful interface for natural language product creation
// =====================================================

import React, { useState } from 'react';
import { Loader2, Sparkles, Check, AlertCircle, Clock, DollarSign, Star } from 'lucide-react';

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

export default function DescribeItGetIt() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [error, setError] = useState('');

  const examples = [
    "I want a black hoodie with a melting candy that says 'melts in your mouth and in your hands'",
    "Make me a coffee mug with a funny quote about Monday mornings",
    "Create a t-shirt with an American flag and the text 'Land of the Free'",
    "I need a sticker that says 'I Voted' with patriotic colors",
    "Design a water bottle with motivational fitness quotes"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim() || description.length < 10) {
      setError('Please provide a detailed description (at least 10 characters)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/describe-it-get-it', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to process request');
      }

      setResult(data.result);
      setSelectedVariant(data.result.options[0]?.variants[0]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    const option = result.options[selectedOption];
    console.log('Adding to cart:', {
      product_id: option.product_id,
      variant: selectedVariant,
      price: option.price
    });
    
    // TODO: Integrate with cart system
    alert('Product added to cart! (Integration coming soon)');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Product Creation
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Describe It, Get It
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tell us what you want in plain English. We'll create it, show you mockups, 
            and connect you with the best suppliers.
          </p>
        </div>

        {/* Input Form */}
        <div className="max-w-3xl mx-auto mb-12">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: I want a black hoodie with a melting candy that says 'melts in your mouth and in your hands'"
              className="w-full h-32 px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all resize-none"
              disabled={loading}
            />
            
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Product
                </>
              )}
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Examples */}
          {!result && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-600 mb-3">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(example)}
                    className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    {example.length > 60 ? example.substring(0, 60) + '...' : example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="max-w-6xl mx-auto">
            {/* Legal Status Banner */}
            {result.options[selectedOption]?.legal_status === 'flagged' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">Legal Review Required</p>
                  <p className="text-sm text-yellow-800">
                    This design has been flagged for trademark or copyright review. 
                    It will be available once approved by our team.
                  </p>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Mockup */}
              <div>
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <img
                    src={result.options[selectedOption]?.mockup_url}
                    alt={result.options[selectedOption]?.title}
                    className="w-full aspect-square object-cover"
                  />
                </div>

                {/* Variant Selector */}
                <div className="mt-6 bg-white rounded-xl p-6 shadow-md">
                  <h3 className="font-semibold text-gray-900 mb-4">Select Options</h3>
                  
                  {/* Sizes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {result.options[selectedOption]?.variants.map((variant: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                            selectedVariant?.size === variant.size
                              ? 'border-purple-600 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {variant.size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {result.parsed?.colors?.map((color: string, i: number) => (
                        <button
                          key={i}
                          className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-all"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Details & Suppliers */}
              <div>
                {/* Product Info */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {result.options[selectedOption]?.title}
                  </h2>
                  <p className="text-4xl font-bold text-purple-600 mb-6">
                    ${result.options[selectedOption]?.price.toFixed(2)}
                  </p>

                  {/* Parsed Details */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Product Type:</span>
                      <span className="text-gray-900 capitalize">{result.parsed?.productType?.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Slogan:</span>
                      <span className="text-gray-900">"{result.parsed?.sloganText}"</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Tone:</span>
                      <span className="text-gray-900 capitalize">{result.parsed?.tone}</span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={addToCart}
                    disabled={result.options[selectedOption]?.legal_status !== 'approved'}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {result.options[selectedOption]?.legal_status === 'approved' ? (
                      <>
                        <Check className="w-5 h-5" />
                        Add to Cart
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        Awaiting Approval
                      </>
                    )}
                  </button>
                </div>

                {/* Supplier Options */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Choose Your Supplier
                  </h3>
                  
                  <div className="space-y-3">
                    {result.options?.map((option: ProductOption, i: number) => (
                      <button
                        key={i}
                        onClick={() => setSelectedOption(i)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedOption === i
                            ? 'border-purple-600 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{option.supplier.name}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-gray-600">{option.supplier.quality_score.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">${option.price.toFixed(2)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {option.supplier.total_days} days
                          </div>
                          <div>
                            Production: {option.supplier.production_days}d
                          </div>
                          <div>
                            Shipping: {option.supplier.shipping_days}d
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
