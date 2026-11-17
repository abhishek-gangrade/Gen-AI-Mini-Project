import React, { useState, useEffect } from 'react';
import { analyticsAPI, aiAPI } from '../services/api';
import {
  BarChart3,
  Download,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Sparkles,
  Smile,
  Frown,
  Meh,
  Flame,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const Analytics = () => {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'gaps'
  const [metrics, setMetrics] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, gapRes] = await Promise.all([
          analyticsAPI.getDashboardMetrics(),
          aiAPI.getKnowledgeGaps().catch(() => ({ data: { report: { gaps: [] } } }))
        ]);

        if (dashRes.data?.success) {
          setMetrics(dashRes.data.metrics);
        }
        if (gapRes.data?.success) {
          setGaps(gapRes.data.report?.gaps || []);
        }
      } catch (err) {
        console.error('[Analytics Error]:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await analyticsAPI.exportCSV();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resolveai_tickets_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('[CSV Export Error]:', err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const priorityData = metrics?.priorityDistribution || [];
  const sentimentData = metrics?.sentimentDistribution || [];
  const categoryData = metrics?.categoryDistribution || [];
  const agentWorkloads = metrics?.agentWorkloads || [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics & Business Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational SLA statistics, sentiment patterns, and Knowledge Gap detection.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{exporting ? 'Generating CSV...' : 'Export Report (CSV)'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'metrics'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Operational KPIs & Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('gaps')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'gaps'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Knowledge Gap Detection</span>
          {gaps.length > 0 && (
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">
              {gaps.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: METRICS & CHARTS */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Tickets by Category</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tick={{ fontSize: 11, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val) => [`${val} tickets`, 'Count']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Customer Sentiment Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900">Sentiment Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [`${val} tickets`, 'Count']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {sentimentData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Agent Efficiency Leaderboard */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Agent Performance & Active Workloads</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Specialist</th>
                    <th className="px-4 py-3">Role & Department</th>
                    <th className="px-4 py-3">Active Assigned Tickets</th>
                    <th className="px-4 py-3">Resolved Tickets</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentWorkloads.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 flex items-center space-x-2.5">
                        {agent.avatar ? (
                          <img src={agent.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold flex items-center justify-center">
                            {agent.name.charAt(0)}
                          </div>
                        )}
                        <span>{agent.name}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{agent.department}</td>
                      <td className="px-4 py-3 font-bold text-brand-600">{agent.activeTickets} tickets</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{agent.resolvedTickets} resolved</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Online
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE GAP DETECTION (Module I) */}
      {activeTab === 'gaps' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-2 text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Differentiating Feature: Automated Knowledge Gap Detection</span>
            </div>
            <p>
              ResolveAI automatically audits inquiries where vector similarity fell below threshold or where AI indicated missing documentation.
              These topics represent missing company guidelines that need to be authored to eliminate future support escalations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gaps.length === 0 ? (
              <div className="col-span-3 bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                All recent queries have sufficient knowledge base coverage. No knowledge gaps detected!
              </div>
            ) : (
              gaps.map((gap, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{gap.suggested_topic}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Freq: {gap.frequency}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Sample Customer Inquiry:
                    </span>
                    <p className="italic">"{gap.query}"</p>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Average Retrieval Confidence:</span>
                    <span className="font-mono font-bold text-rose-600">
                      {Math.round(gap.average_confidence * 100)}% (Low)
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Tickets: {gap.ticket_ids?.slice(0, 2).join(', ')}
                    </span>
                    <span className="text-[11px] font-semibold text-brand-600">
                      + Add to KB
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
