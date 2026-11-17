import React, { useState, useEffect } from 'react';
import { ticketsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Smile,
  Frown,
  Meh,
  Flame,
  AlertCircle,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Filters
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [sentiment, setSentiment] = useState('all');
  const [search, setSearch] = useState('');

  // New Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Billing & Payments');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketsAPI.getTickets({
        status,
        priority,
        category,
        sentiment,
        search,
        page,
        limit: 10
      });
      if (res.data?.success) {
        setTickets(res.data.tickets);
        setTotal(res.data.total);
        setPages(res.data.pages);
      }
    } catch (err) {
      console.error('[Tickets Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [status, priority, category, sentiment, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);

    try {
      const res = await ticketsAPI.createTicket({
        subject: newSubject,
        description: newDescription,
        category: newCategory
      });
      if (res.data?.success) {
        setIsModalOpen(false);
        setNewSubject('');
        setNewDescription('');
        fetchTickets();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const sentimentIcon = (s) => {
    switch (s?.toLowerCase()) {
      case 'positive':
        return <Smile className="w-3.5 h-3.5 text-emerald-600" />;
      case 'negative':
        return <Frown className="w-3.5 h-3.5 text-orange-600" />;
      case 'frustrated':
        return <Flame className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return <Meh className="w-3.5 h-3.5 text-slate-400" />;
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

  const statusBadge = (st) => {
    const colors = {
      'New': 'bg-purple-100 text-purple-700 border-purple-200',
      'Open': 'bg-blue-100 text-blue-700 border-blue-200',
      'In Progress': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Waiting for Customer': 'bg-amber-100 text-amber-700 border-amber-200',
      'Escalated': 'bg-rose-100 text-rose-700 border-rose-200',
      'Resolved': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Closed': 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${colors[st] || 'bg-slate-100'}`}>
        {st}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {user?.role === 'customer' ? 'My Support Tickets' : 'Ticket Management'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role === 'customer'
              ? 'Track your inquiries and real-time support responses.'
              : 'Filter, triage, review AI suggested responses, and manage escalations.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm shadow-brand-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket ID, subject, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="New">New</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Escalated">Escalated</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 hidden sm:block"
            >
              <option value="all">All Categories</option>
              <option value="Billing & Payments">Billing & Payments</option>
              <option value="Account & Access">Account & Access</option>
              <option value="Shipping & Delivery">Shipping & Delivery</option>
              <option value="Technical Support">Technical Support</option>
              <option value="Product & Feature">Product & Feature</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>

            <select
              value={sentiment}
              onChange={(e) => { setSentiment(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 hidden sm:block"
            >
              <option value="all">All Sentiments</option>
              <option value="Positive">Positive</option>
              <option value="Neutral">Neutral</option>
              <option value="Negative">Negative</option>
              <option value="Frustrated">Frustrated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Ticket ID</th>
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Priority</th>
                <th className="px-6 py-3.5">Sentiment</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Assigned To</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading tickets...</span>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No tickets matching the filter criteria.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try resetting your filters or create a new ticket.</p>
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-bold text-brand-600 whitespace-nowrap">
                      <Link to={`/tickets/${t._id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-semibold text-slate-900">
                      <Link to={`/tickets/${t._id}`} className="hover:text-brand-600">
                        {t.subject}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      <div className="flex items-center space-x-2">
                        {t.customer?.avatar ? (
                          <img src={t.customer.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                            {t.customer?.name?.charAt(0) || 'C'}
                          </div>
                        )}
                        <span>{t.customer?.name || 'Customer'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {t.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {priorityBadge(t.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        {sentimentIcon(t.sentiment)}
                        <span className="capitalize text-slate-700">{t.sentiment}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {statusBadge(t.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {t.assignedAgent?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        to={`/tickets/${t._id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition shadow-xs"
                      >
                        Open Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{tickets.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{total}</span> tickets
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Ticket className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-bold text-slate-900">Create New Support Ticket</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject / Problem Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment deducted but order is not confirmed"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Billing & Payments">Billing & Payments</option>
                  <option value="Account & Access">Account & Access</option>
                  <option value="Shipping & Delivery">Shipping & Delivery</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Product & Feature">Product & Feature</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Please describe the issue in detail, including error messages, order IDs, or actions attempted..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* AI Auto-triage badge note */}
              <div className="p-3 rounded-xl bg-brand-50/60 border border-brand-100 flex items-start space-x-2.5 text-[11px] text-brand-900">
                <Sparkles className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">AI Automated Triage:</span> Upon submission, ResolveAI will automatically categorize this issue, predict urgency & sentiment, and retrieve applicable knowledge base policies.
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Analyzing & Creating...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
