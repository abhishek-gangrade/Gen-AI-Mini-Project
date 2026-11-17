import React, { useState } from 'react';
import { knowledgeAPI, aiAPI } from '../services/api';
import {
  Bot,
  Search,
  Sparkles,
  BookOpen,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

export const AIAssistant = () => {
  const [activeTab, setActiveTab] = useState('rag'); // 'rag' | 'classifier'

  // RAG State
  const [query, setQuery] = useState('How many days do I have to return an item for a full refund?');
  const [tone, setTone] = useState('Professional');
  const [topK, setTopK] = useState(3);
  const [searching, setSearching] = useState(false);
  const [ragResult, setRagResult] = useState(null);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [draftCopied, setDraftCopied] = useState(false);

  // Classifier State
  const [testSubject, setTestSubject] = useState('Payment deducted from bank but order still pending');
  const [testDesc, setTestDesc] = useState('I purchased the annual developer license earlier today. $240 was taken from my account but the dashboard shows pending.');
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState(null);

  const handleTestRAG = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setRagResult(null);
    setGeneratedDraft('');

    try {
      // 1. Query Knowledge Base Vector Store
      const res = await knowledgeAPI.testQuery({
        query,
        topK: parseInt(topK, 10),
        minSimilarity: 0.20
      });

      if (res.data?.success) {
        setRagResult(res.data.results);

        // 2. Synthesize Grounded Response
        const draftRes = await aiAPI.generateDraft({
          ticketId: 'test-session-id',
          tone
        });

        // If not tied to a real ticket, test query gives us sources, let's show the synthesized preview
        const hasContext = res.data.results.has_sufficient_context;
        const sources = res.data.results.sources;

        if (!hasContext || sources.length === 0) {
          setGeneratedDraft(
            `Hello there,\n\nThank you for reaching out regarding "${query}".\n\nOur official knowledge base does not currently contain verified documentation addressing this specific inquiry. To ensure you receive completely accurate details without speculation, this inquiry has been flagged for human verification.\n\nA support specialist will review your request and reply directly.`
          );
        } else {
          const docTitle = sources[0].doc_title;
          const snippet = sources[0].snippet.split('\n')[0];
          setGeneratedDraft(
            `Hello,\n\nThank you for contacting customer support regarding "${query}".\n\nAccording to our official guidelines in [${docTitle}]:\n\n"${sources[0].snippet}"\n\nPlease let us know if you need any additional assistance.\n\nBest regards,\nResolveAI Support Team`
          );
        }
      }
    } catch (err) {
      console.error('[RAG Test Error]:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleTestClassifier = async (e) => {
    e.preventDefault();
    setClassifying(true);
    setClassifyResult(null);

    try {
      const res = await aiAPI.classifyText({
        subject: testSubject,
        description: testDesc
      });
      if (res.data?.success) {
        setClassifyResult(res.data.result);
      }
    } catch (err) {
      console.error('[Classifier Test Error]:', err);
    } finally {
      setClassifying(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generatedDraft);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2000);
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Assistant & RAG Playground</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Interactively test ChromaDB semantic document retrieval, grounded response generation, and AI triage classification.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('rag')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'rag'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Semantic Retrieval & Grounded RAG</span>
        </button>

        <button
          onClick={() => setActiveTab('classifier')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === 'classifier'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Intent, Priority & Sentiment Classifier</span>
        </button>
      </div>

      {/* TAB 1: RAG & Semantic Retrieval */}
      {activeTab === 'rag' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Query Form (Span 5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Search className="w-4 h-4 text-brand-600" />
              <span>Query Knowledge Base (ChromaDB)</span>
            </h2>

            <form onSubmit={handleTestRAG} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Query / Problem</label>
                <textarea
                  rows="3"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter a customer question or issue..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Response Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Professional', 'Friendly', 'Concise', 'Detailed'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`p-2 rounded-xl text-[11px] font-semibold border transition ${
                        tone === t
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Top-K Sources</span>
                  <span>{topK} Chunks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-full accent-brand-600"
                />
              </div>

              {/* Sample Quick Questions */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500 block">Try sample queries:</span>
                <div className="flex flex-col space-y-1">
                  {[
                    'What happens if I was charged twice on my card?',
                    'Can I unlock my account if I lost my 2FA phone?',
                    'How long does standard delivery take to arrive?',
                    'Do you provide custom docker containers with GPU? (Missing in KB)'
                  ].map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQuery(sample)}
                      className="text-left text-[11px] text-brand-600 hover:underline truncate"
                    >
                      • {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{searching ? 'Querying ChromaDB...' : 'Search & Generate Grounded Response'}</span>
              </button>
            </form>
          </div>

          {/* Retrieval Results & Draft (Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Grounded Response Preview */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  <span>Synthesized Grounded Response</span>
                </h3>
                {generatedDraft && (
                  <button
                    onClick={handleCopyDraft}
                    className="flex items-center space-x-1 text-[11px] font-semibold text-slate-600 hover:text-brand-600 transition"
                  >
                    {draftCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{draftCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {generatedDraft ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {generatedDraft}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Run a query on the left to test semantic retrieval and view the grounded response.
                </div>
              )}
            </div>

            {/* Retrieved Citations */}
            {ragResult && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span>Retrieved Knowledge Chunks ({ragResult.sources?.length || 0})</span>
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      ragResult.has_sufficient_context
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {ragResult.has_sufficient_context ? 'SUFFICIENT CONTEXT' : 'LOW CONFIDENCE / UNKNOWN'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {ragResult.sources?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center">
                      No matching documents found with sufficient similarity in ChromaDB.
                    </p>
                  ) : (
                    ragResult.sources.map((src, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>📄 {src.doc_title}</span>
                          <span className="text-[10px] font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                            Similarity: {Math.round(src.score * 100)}%
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed italic">"{src.snippet}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Intent & Sentiment Classifier */}
      {activeTab === 'classifier' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Input Customer Ticket Text</span>
            </h2>

            <form onSubmit={handleTestClassifier} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="Ticket subject line..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Problem Description</label>
                <textarea
                  rows="4"
                  value={testDesc}
                  onChange={(e) => setTestDesc(e.target.value)}
                  placeholder="Full customer inquiry..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={classifying}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                <span>{classifying ? 'Analyzing NLP Features...' : 'Classify Ticket'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Predicted Triage Results
            </h2>

            {classifyResult ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-medium">Predicted Intent:</span>
                  <span className="font-bold text-slate-900">{classifyResult.intent}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-medium">Assigned Category:</span>
                  <span className="font-bold text-slate-900">{classifyResult.category}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-medium">Priority Level:</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    {classifyResult.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-medium">Sentiment:</span>
                  <span className="font-bold text-slate-900 capitalize">{classifyResult.sentiment}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                  <span className="text-slate-500 font-medium">Urgency Score:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Math.round(classifyResult.urgency_score * 100)}%
                  </span>
                </div>

                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">Keywords Extracted:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {classifyResult.keywords?.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-[11px] font-medium border border-brand-100">
                        #{kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Submit an inquiry on the left to see live classification output.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
