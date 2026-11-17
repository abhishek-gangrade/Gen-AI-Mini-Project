import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Smile,
  Frown,
  Meh,
  Flame,
  ArrowRight,
  RefreshCw,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

export const Overview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await analyticsAPI.getDashboardMetrics();
      if (res.data?.success) {
        setData(res.data.metrics);
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading live support metrics...</p>
        </div>
      </div>
    );
  }

  const counts = data?.counts || { total: 0, open: 0, inProgress: 0, resolved: 0, escalated: 0 };
  const priorityData = data?.priorityDistribution || [];
  const sentimentData = data?.sentimentDistribution || [];
  const categoryData = data?.categoryDistribution || [];
  const recentActivity = data?.recentActivity || [];
  const agentWorkloads = data?.agentWorkloads || [];

  const sentimentIcon = (s) => {
    switch (s?.toLowerCase()) {
      case 'positive':
        return <Smile className="w-3.5 h-3.5 text-emerald-600" />;
      case 'negative':
        return <Frown className="w-3.5 h-3.5 text-orange-600" />;
      case 'frustrated':
        return <Flame className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Meh className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const priorityBadge = (p) => {
    const colors = {
      Critical: 'bg-rose-100 text-rose-800 border-rose-200',
      High: 'bg-amber-100 text-amber-800 border-amber-200',
      Medium: 'bg-blue-100 text-blue-800 border-blue-200',
      Low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${colors[p] || 'bg-slate-100'}`}>
        {p}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Operations Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time analytics, AI ticket triage, and automated resolution performance.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/tickets"
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition"
          >
            <span>View All Tickets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Tickets</span>
            <Ticket className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{counts.total}</div>
          <div className="text-[11px] text-slate-500">Organization lifetime</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Open & Active</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{counts.open + counts.inProgress}</div>
          <div className="text-[11px] text-slate-500">{counts.inProgress} in progress</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Escalated</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{counts.escalated}</div>
          <div className="text-[11px] text-rose-500 font-medium">Requires supervisor</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{counts.resolved}</div>
          <div className="text-[11px] text-slate-500">Successfully closed</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Avg Resolution</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data?.avgResolutionHours || 3.5}h</div>
          <div className="text-[11px] text-emerald-600 font-medium">Within SLA target</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">RAG Grounding</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {data?.ragRetrieval?.ragSuccessRate || 88}%
          </div>
          <div className="text-[11px] text-slate-500">Grounded in ChromaDB</div>
        </div>
      </div>

      {/* Visualizations Section: 3 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Priority Distribution</h2>
              <p className="text-xs text-slate-500">Breakdown of active tickets</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Live
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} tickets`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {priorityData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </span>
                <span className="font-semibold text-slate-900">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Sentiment Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Customer Sentiment</h2>
              <p className="text-xs text-slate-500">AI analysis of incoming tone</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
              NLP
            </span>
          </div>

          <div className="h-56">
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

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {sentimentData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5 text-slate-600">
                  {sentimentIcon(s.name)}
                  <span>{s.name}</span>
                </span>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Categories</h2>
              <p className="text-xs text-slate-500">Volume by ticket category</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Distribution
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {categoryData.slice(0, 5).map((cat, i) => {
              const maxCount = Math.max(...categoryData.map(c => c.count), 1);
              const percentage = Math.round((cat.count / maxCount) * 100);
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate">{cat.category}</span>
                    <span className="font-semibold text-slate-900">{cat.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Agent Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ticket Activity (Span 2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Ticket Activity</h2>
              <p className="text-xs text-slate-500">Incoming tickets and updates across the platform</p>
            </div>
            <Link to="/tickets" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1">
              <span>View Table</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No recent tickets recorded.</p>
            ) : (
              recentActivity.map((t) => (
                <Link
                  key={t._id}
                  to={`/tickets/${t._id}`}
                  className="py-3 flex items-center justify-between hover:bg-slate-50/80 -mx-3 px-3 rounded-xl transition block"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                      {t.ticketNumber?.replace('TIC-', '') || 'TIC'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {t.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>{t.customer?.name || 'Customer'}</span>
                        <span>•</span>
                        <span>{t.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <div className="flex items-center space-x-1 text-xs">
                      {sentimentIcon(t.sentiment)}
                      <span className="text-[11px] text-slate-600 capitalize hidden sm:inline">{t.sentiment}</span>
                    </div>
                    {priorityBadge(t.priority)}
                    <span className="text-xs text-slate-400">→</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Agent Workload Standings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Agent Workload</h2>
              <p className="text-xs text-slate-500">Live ticket queue per specialist</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {agentWorkloads.map((agent) => (
              <div key={agent.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                      {agent.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{agent.name}</div>
                    <div className="text-[11px] text-slate-500">{agent.department}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-brand-600">{agent.activeTickets} Active</div>
                  <div className="text-[10px] text-emerald-600">{agent.resolvedTickets} Resolved</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
