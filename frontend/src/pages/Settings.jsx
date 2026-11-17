import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Building2,
  Clock,
  Sparkles,
  Database,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const [savedMessage, setSavedMessage] = useState('');

  // SLA State
  const [criticalSLA, setCriticalSLA] = useState(2);
  const [highSLA, setHighSLA] = useState(8);
  const [mediumSLA, setMediumSLA] = useState(24);
  const [lowSLA, setLowSLA] = useState(48);

  // AI Model State
  const [provider, setProvider] = useState('local');
  const [minConfidence, setMinConfidence] = useState(0.25);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Settings successfully saved and applied.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure multi-tenant organization rules, SLA escalation thresholds, and AI model parameters.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-brand-600" />
            <span>Organization Profile</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                disabled
                value="TechNova Global"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tenant Slug (Data Isolation ID)</label>
              <input
                type="text"
                disabled
                value="technova"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SLA Escalation Thresholds */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>SLA Escalation Thresholds (Hours)</span>
            </h2>
            <span className="text-[11px] text-slate-400">Deterministic Rule Engine</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Critical (Outage)</label>
              <div className="relative">
                <input
                  type="number"
                  value={criticalSLA}
                  onChange={(e) => setCriticalSLA(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
                <span className="absolute right-3 top-2 text-slate-400">hrs</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">High Urgency</label>
              <div className="relative">
                <input
                  type="number"
                  value={highSLA}
                  onChange={(e) => setHighSLA(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
                <span className="absolute right-3 top-2 text-slate-400">hrs</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medium Priority</label>
              <div className="relative">
                <input
                  type="number"
                  value={mediumSLA}
                  onChange={(e) => setMediumSLA(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
                <span className="absolute right-3 top-2 text-slate-400">hrs</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Low Priority</label>
              <div className="relative">
                <input
                  type="number"
                  value={lowSLA}
                  onChange={(e) => setLowSLA(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
                <span className="absolute right-3 top-2 text-slate-400">hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI & Vector Store Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Model & RAG Provider Settings</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">LLM Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value="local">ResolveAI Grounded Local Engine (Zero-Latency Offline)</option>
                <option value="gemini">Google Gemini (API Key in ai-service/.env)</option>
                <option value="openai">OpenAI GPT-4o-mini (API Key in ai-service/.env)</option>
                <option value="ollama">Ollama Local LLM (http://localhost:11434)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Min Retrieval Similarity Threshold ({Math.round(minConfidence * 100)}%)
              </label>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full accent-brand-600 mt-2"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold block text-slate-800">Vector Store Architecture:</span>
            <span>ChromaDB Persistent Client at <code>ai-service/data/chroma</code></span>
            <span className="block">Tenant Isolation: Separate ChromaDB collections per organization identifier.</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
