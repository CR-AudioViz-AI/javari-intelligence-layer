'use client';

// =====================================================
// JAVARI KNOWLEDGE DASHBOARD
// Created: November 18, 2025 - 10:30 PM EST
// Purpose: Watch Javari learn and grow in real-time
// =====================================================

import React, { useState, useEffect } from 'react';
import { 
  Brain, Upload, TrendingUp, BookOpen, Zap, Database,
  Activity, CheckCircle, Clock, Target, BarChart3, 
  FileText, Globe, Code, Sparkles, RefreshCw, Eye,
  ArrowUpRight, Calendar, Users, MessageSquare
} from 'lucide-react';

interface KnowledgeStats {
  total_documents: number;
  total_chunks: number;
  total_embeddings: number;
  total_queries: number;
  avg_confidence: number;
  knowledge_domains: Array<{
    domain: string;
    document_count: number;
    last_updated: string;
  }>;
  recent_learnings: Array<{
    id: string;
    title: string;
    source: string;
    created_at: string;
    chunk_count: number;
  }>;
  query_performance: {
    total_queries: number;
    successful_queries: number;
    avg_confidence: number;
    improvement_rate: number;
  };
  growth_timeline: Array<{
    date: string;
    documents: number;
    queries: number;
    confidence: number;
  }>;
}

interface UploadProgress {
  uploading: boolean;
  filename: string;
  progress: number;
  chunks_processed: number;
  total_chunks: number;
}

export default function JavariKnowledgeDashboard() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'upload' | 'sources'>('overview');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch knowledge stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/knowledge/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchStats();
    
    if (autoRefresh) {
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Upload file
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploadProgress({
      uploading: true,
      filename: selectedFile.name,
      progress: 0,
      chunks_processed: 0,
      total_chunks: 0
    });

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress({
          uploading: false,
          filename: selectedFile.name,
          progress: 100,
          chunks_processed: data.chunks_created,
          total_chunks: data.chunks_created
        });

        // Refresh stats
        setTimeout(fetchStats, 1000);
        setSelectedFile(null);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadProgress(null);
    }
  };

  // Upload manual text
  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualText || !manualTitle) return;

    setUploadProgress({
      uploading: true,
      filename: manualTitle,
      progress: 0,
      chunks_processed: 0,
      total_chunks: 0
    });

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle,
          content: manualText,
          source: 'manual_input'
        })
      });

      const data = await response.json();

      if (data.success) {
        setUploadProgress({
          uploading: false,
          filename: manualTitle,
          progress: 100,
          chunks_processed: data.chunks_created,
          total_chunks: data.chunks_created
        });

        // Refresh stats and clear form
        setTimeout(fetchStats, 1000);
        setManualText('');
        setManualTitle('');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading Javari's knowledge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Brain className="w-12 h-12 text-indigo-600" />
                <Sparkles className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Javari Knowledge Center
                </h1>
                <p className="text-gray-600 mt-1">
                  Watch your AI assistant learn and grow in real-time
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  autoRefresh 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
              
              <button
                onClick={fetchStats}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Now
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="w-5 h-5" />
              Overview
            </button>
            
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'upload'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Upload className="w-5 h-5" />
              Feed Knowledge
            </button>
            
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === 'sources'
                  ? 'border-indigo-600 text-indigo-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="w-5 h-5" />
              Knowledge Sources
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Knowledge</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.total_documents.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">documents</p>
                  </div>
                  <BookOpen className="w-12 h-12 text-indigo-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Growing every day
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Knowledge Chunks</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.total_chunks.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">searchable pieces</p>
                  </div>
                  <Database className="w-12 h-12 text-purple-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-purple-600">
                  <Zap className="w-4 h-4 mr-1" />
                  Instant retrieval
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Queries Answered</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {stats.total_queries.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">questions</p>
                  </div>
                  <MessageSquare className="w-12 h-12 text-blue-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {stats.query_performance.successful_queries > 0 
                    ? `${((stats.query_performance.successful_queries / stats.query_performance.total_queries) * 100).toFixed(1)}% success`
                    : 'Ready to learn'
                  }
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Confidence</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {(stats.avg_confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">accuracy</p>
                  </div>
                  <Target className="w-12 h-12 text-green-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stats.query_performance.improvement_rate > 0 
                    ? `+${stats.query_performance.improvement_rate.toFixed(1)}% this week`
                    : 'Baseline established'
                  }
                </div>
              </div>
            </div>

            {/* Knowledge Domains */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600" />
                Knowledge Domains
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.knowledge_domains.map((domain, index) => (
                  <div 
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{domain.domain}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {domain.document_count} documents
                        </p>
                      </div>
                      <Code className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      Updated {new Date(domain.last_updated).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Learnings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Recent Learnings
              </h3>
              
              <div className="space-y-3">
                {stats.recent_learnings.map((learning) => (
                  <div 
                    key={learning.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-900">{learning.title}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {learning.source} • {learning.chunk_count} chunks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(learning.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(learning.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {/* Upload Progress */}
            {uploadProgress && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {uploadProgress.uploading ? 'Processing...' : 'Upload Complete!'}
                  </h3>
                  {uploadProgress.uploading ? (
                    <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{uploadProgress.filename}</p>
                
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                
                <p className="text-sm text-gray-600">
                  {uploadProgress.chunks_processed} chunks processed
                </p>
              </div>
            )}

            {/* File Upload */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload Document
              </h3>
              
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".txt,.md,.pdf,.docx"
                    className="hidden"
                    id="file-upload"
                  />
                  <label 
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-700 font-medium">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      TXT, MD, PDF, DOCX (up to 10MB)
                    </p>
                  </label>
                </div>
                
                <button
                  type="submit"
                  disabled={!selectedFile || uploadProgress?.uploading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploadProgress?.uploading ? 'Processing...' : 'Upload Document'}
                </button>
              </form>
            </div>

            {/* Manual Text Input */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Add Knowledge Manually
              </h3>
              
              <form onSubmit={handleManualUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g., Real Estate Regulations Florida 2025"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Paste or type knowledge here... The more context you provide, the smarter Javari becomes!"
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    {manualText.length} characters • ~{Math.ceil(manualText.length / 500)} chunks
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={!manualText || !manualTitle || uploadProgress?.uploading}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploadProgress?.uploading ? 'Processing...' : 'Add to Knowledge Base'}
                </button>
              </form>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Tips for Better Learning
              </h4>
              
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Include context and background information - Javari learns better with full context</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use clear titles that describe the knowledge domain</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Upload related documents together to build domain expertise</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Regular updates keep knowledge fresh and relevant</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && stats && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Knowledge Source Breakdown
              </h3>
              
              <div className="space-y-4">
                {stats.knowledge_domains.map((domain, index) => {
                  const percentage = (domain.document_count / stats.total_documents) * 100;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{domain.domain}</span>
                        <span className="text-sm text-gray-600">
                          {domain.document_count} docs ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
