/**
 * Javari AI - Phase 2 Intelligence Layer
 * Learning Metrics Dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/metrics?range=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading metrics...</p>
        </div>
      </div>
    );
  }

  const overview = metrics?.overview || {};
  const contentGaps = metrics?.contentGaps || [];
  const intentAnalysis = metrics?.intentAnalysis || [];
  const embeddingStats = metrics?.embeddingStats || [];
  const recentQueries = metrics?.recentQueries || [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Javari AI Intelligence Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">Autonomous Learning System - Phase 2</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
              <button
                onClick={fetchMetrics}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium transition"
              >
                Refresh
              </button>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Query Resolution Rate"
            value={`${overview.resolution_rate_24h || 0}%`}
            subtitle={`${overview.resolved_queries_24h || 0}/${overview.queries_24h || 0} queries resolved`}
            trend="up"
          />
          <StatCard
            title="Average Satisfaction"
            value={`${overview.avg_satisfaction_24h || 0}/5`}
            subtitle="User feedback score"
            trend="neutral"
          />
          <StatCard
            title="Embedding Coverage"
            value={`${overview.embedding_coverage_pct || 0}%`}
            subtitle={`${overview.pages_with_embeddings || 0}/${overview.total_pages || 0} pages`}
            trend="up"
          />
          <StatCard
            title="Content Gaps"
            value={overview.open_gaps || 0}
            subtitle={`${overview.critical_gaps || 0} critical`}
            trend={overview.open_gaps > 5 ? 'down' : 'neutral'}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Query Volume Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Query Volume Over Time</h2>
            {metrics?.metricsOverTime?.queryVolume?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.metricsOverTime.queryVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" name="Total Queries" />
                  <Line type="monotone" dataKey="resolved" stroke="#10B981" name="Resolved" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Intent Analysis Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Query Intent Distribution</h2>
            {intentAnalysis.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={intentAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="query_intent" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    labelStyle={{ color: '#F3F4F6' }}
                  />
                  <Legend />
                  <Bar dataKey="query_count" fill="#3B82F6" name="Queries" />
                  <Bar dataKey="resolution_rate" fill="#10B981" name="Resolution %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Content Gaps Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Top Content Gaps</h2>
          {contentGaps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-left">
                    <th className="pb-3 font-medium">Topic</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium text-right">Frequency</th>
                    <th className="pb-3 font-medium text-right">Similarity</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Days Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {contentGaps.slice(0, 10).map((gap: any) => (
                    <tr key={gap.topic} className="hover:bg-gray-800/50">
                      <td className="py-3 font-medium">{gap.topic}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          gap.priority === 'critical' ? 'bg-red-900/50 text-red-300' :
                          gap.priority === 'high' ? 'bg-orange-900/50 text-orange-300' :
                          gap.priority === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {gap.priority}
                        </span>
                      </td>
                      <td className="py-3 text-right">{gap.query_frequency}</td>
                      <td className="py-3 text-right">{(gap.avg_similarity_score * 100).toFixed(1)}%</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-400">
                          {gap.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">{gap.days_open}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No content gaps detected</p>
          )}
        </div>

        {/* Embedding Stats Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Embedding Coverage by Source</h2>
          {embeddingStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr className="text-left">
                    <th className="pb-3 font-medium">Source</th>
                    <th className="pb-3 font-medium text-right">Total Pages</th>
                    <th className="pb-3 font-medium text-right">Embedded</th>
                    <th className="pb-3 font-medium text-right">Coverage</th>
                    <th className="pb-3 font-medium text-right">Avg Tokens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {embeddingStats.map((stat: any) => (
                    <tr key={stat.source_name} className="hover:bg-gray-800/50">
                      <td className="py-3 font-medium">{stat.source_name}</td>
                      <td className="py-3 text-right">{stat.total_pages}</td>
                      <td className="py-3 text-right">{stat.embedded_pages}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-800 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${stat.coverage_pct}%` }}
                            ></div>
                          </div>
                          <span>{stat.coverage_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right">{stat.avg_token_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No embedding stats available</p>
          )}
        </div>

        {/* Recent Queries */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Queries</h2>
          {recentQueries.length > 0 ? (
            <div className="space-y-3">
              {recentQueries.slice(0, 10).map((query: any) => (
                <div key={query.id} className="bg-gray-800/50 rounded p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{query.query_text}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {query.query_intent && (
                          <span className="px-2 py-0.5 bg-gray-700 rounded">{query.query_intent}</span>
                        )}
                        {query.query_complexity && (
                          <span className="px-2 py-0.5 bg-gray-700 rounded">{query.query_complexity}</span>
                        )}
                        {query.detected_topics?.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded">
                            {query.detected_topics.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div className={`font-medium ${query.found_in_docs ? 'text-green-400' : 'text-red-400'}`}>
                        {query.found_in_docs ? '✓ Resolved' : '✗ Not Found'}
                      </div>
                      {query.top_similarity_score !== null && (
                        <div className="text-gray-400">
                          {(query.top_similarity_score * 100).toFixed(1)}% match
                        </div>
                      )}
                      <div className="text-gray-500">
                        {new Date(query.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent queries</p>
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  trend 
}: { 
  title: string; 
  value: string | number; 
  subtitle: string; 
  trend: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`text-2xl ${
          trend === 'up' ? 'text-green-500' :
          trend === 'down' ? 'text-red-500' :
          'text-gray-500'
        }`}>
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
        </div>
      </div>
    </div>
  );
}
