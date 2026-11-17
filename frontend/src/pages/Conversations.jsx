import React, { useState, useEffect } from 'react';
import { ticketsAPI } from '../services/api';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  ArrowRight,
  FileText,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const Conversations = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await ticketsAPI.getTickets({ limit: 20 });
        if (res.data?.success) {
          setTickets(res.data.tickets);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Conversation Intelligence</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Real-time AI summarization of multi-turn customer dialogues, extracted promises, and next actions.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading conversation summaries...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((t) => (
            <div
              key={t._id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-brand-300 transition"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-brand-600 text-xs">{t.ticketNumber}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 font-medium">{t.customer?.name}</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {t.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{t.subject}</h3>
                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  "Initial complaint: {t.description}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>

                <Link
                  to={`/tickets/${t._id}`}
                  className="flex items-center space-x-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  <span>Open Thread & AI Draft</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
