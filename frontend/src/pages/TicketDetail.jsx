import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ticketsAPI, messagesAPI, aiAPI, teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import {
  ArrowLeft,
  Ticket,
  Clock,
  Sparkles,
  BookOpen,
  Send,
  AlertTriangle,
  CheckCircle2,
  Smile,
  Frown,
  Meh,
  Flame,
  User,
  Shield,
  Layers,
  Edit3,
  RefreshCw,
  FileText,
  CornerDownRight,
  ChevronDown,
  Info
} from 'lucide-react';

export const TicketDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState(null);
  const [escalations, setEscalations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // New reply
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Draft Response Tone & Generation
  const [selectedTone, setSelectedTone] = useState('Professional');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [editedDraftText, setEditedDraftText] = useState('');
  const [approvingDraft, setApprovingDraft] = useState(false);

  // Escalation Modal
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);

  // Manual Override Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideSentiment, setOverrideSentiment] = useState('');

  const fetchTicketDetails = async () => {
    try {
      const res = await ticketsAPI.getTicketById(id);
      if (res.data?.success) {
        setTicket(res.data.ticket);
        setMessages(res.data.messages || []);
        setAnalysis(res.data.analysis);
        setConversation(res.data.conversation);
        setDraft(res.data.latestDraft);
        setEditedDraftText(res.data.latestDraft?.suggestedText || '');
        setEscalations(res.data.escalations || []);
        if (res.data.latestDraft?.tone) {
          setSelectedTone(res.data.latestDraft.tone);
        }
      }
    } catch (err) {
      console.error('[Ticket Detail Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentsList = async () => {
    if (user?.role !== 'customer') {
      try {
        const res = await teamAPI.getAgents();
        if (res.data?.success) {
          setAgents(res.data.agents);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchAgentsList();

    // Listen for real-time socket events for this ticket
    const socket = getSocket();
    if (socket) {
      socket.emit('ticket:join', id);

      socket.on('message:new', (data) => {
        if (data.ticketId === id) {
          setMessages((prev) => [...prev, data.message]);
        }
      });

      socket.on('ticket:updated', (data) => {
        if (data.id === id) {
          setTicket((prev) => ({ ...prev, ...data }));
        }
      });
    }

    return () => {
      if (socket) {
        socket.emit('ticket:leave', id);
        socket.off('message:new');
        socket.off('ticket:updated');
      }
    };
  }, [id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSendingMessage(true);

    try {
      const res = await messagesAPI.sendMessage({
        ticketId: id,
        content: replyText,
        isInternalNote: isInternal
      });
      if (res.data?.success) {
        setReplyText('');
        setIsInternal(false);
        // Refresh conversation summary in 1 second
        setTimeout(() => {
          messagesAPI.getConversationSummary(id).then(r => {
            if (r.data?.success) setConversation(r.data.conversation);
          }).catch(() => {});
        }, 1200);
      }
    } catch (err) {
      console.error('[Send Message Error]:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleGenerateDraft = async (tone) => {
    const activeTone = tone || selectedTone;
    setSelectedTone(activeTone);
    setGeneratingDraft(true);

    try {
      const res = await aiAPI.generateDraft({
        ticketId: id,
        tone: activeTone
      });
      if (res.data?.success) {
        setDraft(res.data.draft);
        setEditedDraftText(res.data.draft.suggestedText);
      }
    } catch (err) {
      console.error('[Generate Draft Error]:', err);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!draft) return;
    setApprovingDraft(true);

    try {
      const res = await aiAPI.approveResponse({
        draftId: draft._id,
        responseText: editedDraftText
      });
      if (res.data?.success) {
        setDraft(null);
        setEditedDraftText('');
        fetchTicketDetails();
      }
    } catch (err) {
      console.error('[Approve Error]:', err);
    } finally {
      setApprovingDraft(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await ticketsAPI.updateTicket(id, { status: newStatus });
      if (res.data?.success) {
        setTicket(res.data.ticket);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async (agentId) => {
    try {
      const res = await ticketsAPI.updateTicket(id, { assignedAgent: agentId || null });
      if (res.data?.success) {
        setTicket(res.data.ticket);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    setEscalating(true);
    try {
      const res = await ticketsAPI.escalateTicket(id, { reason: escalateReason });
      if (res.data?.success) {
        setTicket(res.data.ticket);
        setEscalateModalOpen(false);
        setEscalateReason('');
        fetchTicketDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEscalating(false);
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await ticketsAPI.overrideAnalysis(id, {
        category: overrideCategory || analysis?.category,
        priority: overridePriority || analysis?.priority,
        sentiment: overrideSentiment || analysis?.sentiment
      });
      if (res.data?.success) {
        setAnalysis(res.data.analysis);
        setTicket(res.data.ticket);
        setOverrideModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading ticket details & AI context...</p>
        </div>
      </div>
    );
  }

  const sentimentIcon = (s) => {
    switch (s?.toLowerCase()) {
      case 'positive':
        return <Smile className="w-4 h-4 text-emerald-600" />;
      case 'negative':
        return <Frown className="w-4 h-4 text-orange-600" />;
      case 'frustrated':
        return <Flame className="w-4 h-4 text-rose-600" />;
      default:
        return <Meh className="w-4 h-4 text-slate-500" />;
    }
  };

  const priorityColor = {
    Critical: 'bg-rose-100 text-rose-800 border-rose-300',
    High: 'bg-amber-100 text-amber-800 border-amber-300',
    Medium: 'bg-blue-100 text-blue-800 border-blue-300',
    Low: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  }[ticket.priority] || 'bg-slate-100';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            to="/tickets"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-lg">{ticket.ticketNumber}</span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${priorityColor}`}>
                {ticket.priority}
              </span>
              {ticket.isEscalated && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white animate-pulse">
                  ESCALATED
                </span>
              )}
            </div>
            <h1 className="text-base font-semibold text-slate-800 mt-0.5">{ticket.subject}</h1>
          </div>
        </div>

        {/* Quick Actions (Agent/Admin/Supervisor) */}
        {user?.role !== 'customer' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="New">Status: New</option>
              <option value="Open">Status: Open</option>
              <option value="In Progress">Status: In Progress</option>
              <option value="Waiting for Customer">Status: Waiting for Customer</option>
              <option value="Escalated">Status: Escalated</option>
              <option value="Resolved">Status: Resolved</option>
              <option value="Closed">Status: Closed</option>
            </select>

            {/* Agent Assign Select */}
            <select
              value={ticket.assignedAgent?._id || ''}
              onChange={(e) => handleAssignAgent(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Unassigned</option>
              {agents.map((ag) => (
                <option key={ag._id} value={ag._id}>
                  Assign: {ag.name}
                </option>
              ))}
            </select>

            {/* Escalate Button */}
            {!ticket.isEscalated && (
              <button
                onClick={() => setEscalateModalOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Escalate</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversation Thread (Span 7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Conversation History</span>
                <span className="text-xs font-medium text-slate-400">({messages.length} messages)</span>
              </h2>
              <div className="text-[11px] text-slate-500">
                Created: {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
              {messages.map((m) => {
                const isCustomer = m.senderRole === 'customer';
                const isInternalNote = m.isInternalNote;

                if (isInternalNote && user?.role === 'customer') {
                  return null; // hide private internal notes from customers
                }

                return (
                  <div
                    key={m._id}
                    className={`flex flex-col ${
                      isInternalNote
                        ? 'items-center'
                        : isCustomer
                        ? 'items-start'
                        : 'items-end'
                    }`}
                  >
                    {isInternalNote ? (
                      <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-[11px] text-amber-800">
                          <span className="flex items-center space-x-1">
                            <Shield className="w-3.5 h-3.5 text-amber-600" />
                            <span>Internal Staff Note • {m.sender?.name}</span>
                          </span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-xs space-y-1.5 ${
                          isCustomer
                            ? 'bg-slate-100 text-slate-900 rounded-tl-sm'
                            : 'bg-brand-600 text-white rounded-tr-sm'
                        }`}
                      >
                        <div
                          className={`flex items-center justify-between space-x-4 text-[10px] font-semibold ${
                            isCustomer ? 'text-slate-500' : 'text-brand-100'
                          }`}
                        >
                          <span>{m.sender?.name || (isCustomer ? 'Customer' : 'Support Specialist')}</span>
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Write a Reply</span>
                {user?.role !== 'customer' && (
                  <label className="flex items-center space-x-1.5 text-xs text-amber-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="font-medium text-[11px]">Private Internal Note</span>
                  </label>
                )}
              </div>

              <textarea
                rows="3"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={
                  isInternal
                    ? 'Write a private note visible only to support staff...'
                    : 'Type your message to the customer...'
                }
                className={`w-full p-3 text-xs border rounded-xl focus:outline-none focus:ring-2 ${
                  isInternal
                    ? 'border-amber-300 bg-amber-50/40 focus:ring-amber-500'
                    : 'border-slate-300 focus:ring-brand-500'
                }`}
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sendingMessage || !replyText.trim()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingMessage ? 'Sending...' : isInternal ? 'Save Internal Note' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: AI Insights, RAG Draft & Summaries (Span 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: AI Ticket Classification & Triage (Module C) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  AI Triage & Classification
                </h3>
              </div>
              {user?.role !== 'customer' && (
                <button
                  onClick={() => {
                    setOverrideCategory(analysis?.category || ticket.category);
                    setOverridePriority(analysis?.priority || ticket.priority);
                    setOverrideSentiment(analysis?.sentiment || ticket.sentiment);
                    setOverrideModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Override</span>
                </button>
              )}
            </div>

            {analysis ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Predicted Intent:</span>
                  <span className="font-semibold text-slate-900 text-right">{analysis.intent}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Detected Category:</span>
                  <span className="font-semibold text-slate-900">{analysis.category}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer Sentiment:</span>
                  <div className="flex items-center space-x-1.5 font-semibold">
                    {sentimentIcon(analysis.sentiment)}
                    <span className="capitalize text-slate-900">{analysis.sentiment}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Urgency Score:</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          analysis.urgencyScore > 0.7 ? 'bg-rose-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.round(analysis.urgencyScore * 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900">
                      {Math.round(analysis.urgencyScore * 100)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500 mb-1">Extracted Keywords:</div>
                  <div className="flex flex-wrap gap-1">
                    {(analysis.keywords || []).map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>

                {analysis.isAgentOverridden && (
                  <div className="text-[10px] text-purple-700 bg-purple-50 p-2 rounded-lg font-medium border border-purple-100">
                    ✓ Human agent verified & updated classification.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Analysis pending or unavailable.</p>
            )}
          </div>

          {/* Card 2: AI Response Draft Grounded in RAG (Module E & F) */}
          {user?.role !== 'customer' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    AI Suggested Response (RAG)
                  </h3>
                </div>
                <button
                  onClick={() => handleGenerateDraft()}
                  disabled={generatingDraft}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${generatingDraft ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {/* Tone Style Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                {['Professional', 'Friendly', 'Concise', 'Detailed'].map((t) => (
                  <button
                    key={t}
                    onClick={() => handleGenerateDraft(t)}
                    disabled={generatingDraft}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedTone === t
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Draft Status & Grounded Notice */}
              {draft?.sufficientContext === false && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start space-x-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Context Notice:</strong> No exact matching knowledge base policy found.
                    Human agent verification is recommended before sending.
                  </span>
                </div>
              )}

              {/* Editable Suggested Response Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Editable Draft (Human-in-the-Loop):</span>
                  <span>Provider: {draft?.modelProvider || 'ResolveAI Local'}</span>
                </div>
                <textarea
                  rows="6"
                  value={editedDraftText}
                  onChange={(e) => setEditedDraftText(e.target.value)}
                  placeholder="Click Regenerate to draft response with RAG context..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/40 font-sans leading-relaxed"
                />
              </div>

              {/* Retrieved Sources & Citations */}
              {draft?.retrievedSources && draft.retrievedSources.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                    Grounded Knowledge Citations (ChromaDB):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {draft.retrievedSources.map((src, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span className="truncate">📄 {src.docTitle}</span>
                          <span className="text-[10px] text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded font-mono">
                            {Math.round(src.score * 100)}% Match
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 italic">"{src.snippet}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approve & Send Action Button */}
              <button
                onClick={handleApproveAndSend}
                disabled={approvingDraft || !editedDraftText.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{approvingDraft ? 'Approving & Sending...' : 'Approve & Send to Customer'}</span>
              </button>
            </div>
          )}

          {/* Card 3: Conversation Summarization (Module G) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Conversation Summary
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                Multi-Turn
              </span>
            </div>

            {conversation ? (
              <div className="space-y-2.5 text-xs text-slate-700">
                <p className="leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {conversation.summary || 'Summary generating...'}
                </p>

                {conversation.troubleshootingAttempted?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">Attempted Actions:</span>
                    <ul className="list-disc list-inside text-[11px] text-slate-600 pl-1 space-y-0.5">
                      {conversation.troubleshootingAttempted.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {conversation.suggestedNextAction && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900 text-[11px] space-y-0.5">
                    <span className="font-semibold block">Recommended Next Action:</span>
                    <span>{conversation.suggestedNextAction}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No summary available yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Escalate Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Escalate Ticket to Supervisor</h3>
            </div>
            <p className="text-xs text-slate-500">
              Escalating will raise the ticket priority to <strong>Critical</strong>, update status to{' '}
              <strong>Escalated</strong>, and immediately dispatch alerts to supervisor queues.
            </p>

            <form onSubmit={handleEscalate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Escalation
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. SLA threshold breached, customer requested supervisor, production block..."
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setEscalateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={escalating}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {escalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Classification Override Modal */}
      {overrideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-brand-600">
              <Edit3 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Override AI Classification</h3>
            </div>
            <p className="text-xs text-slate-500">
              Manually correct the predicted category, priority, or sentiment for this ticket.
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sentiment</label>
                <select
                  value={overrideSentiment}
                  onChange={(e) => setOverrideSentiment(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Positive">Positive</option>
                  <option value="Neutral">Neutral</option>
                  <option value="Negative">Negative</option>
                  <option value="Frustrated">Frustrated</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition"
                >
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
