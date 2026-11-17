import React, { useState, useEffect } from 'react';
import { knowledgeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  File,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

export const KnowledgeBase = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // File Upload State
  const [file, setFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('General Policy');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Direct Text Modal State
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textCategory, setTextCategory] = useState('General Policy');
  const [savingText, setSavingText] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await knowledgeAPI.getDocuments();
      if (res.data?.success) {
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      console.error('[KB Fetch Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', docTitle || file.name);
      formData.append('category', docCategory);

      const res = await knowledgeAPI.uploadDocument(formData);
      if (res.data?.success) {
        setUploadSuccess(`"${res.data.document.title}" was successfully processed and indexed into ChromaDB!`);
        setFile(null);
        setDocTitle('');
        fetchDocuments();
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDirectTextSubmit = async (e) => {
    e.preventDefault();
    setSavingText(true);
    try {
      const res = await knowledgeAPI.createDirect({
        title: textTitle,
        content: textContent,
        category: textCategory
      });
      if (res.data?.success) {
        setTextModalOpen(false);
        setTextTitle('');
        setTextContent('');
        fetchDocuments();
      }
    } catch (err) {
      console.error('[Direct Doc Error]:', err);
    } finally {
      setSavingText(false);
    }
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove all vector embeddings from ChromaDB.`)) {
      return;
    }
    try {
      await knowledgeAPI.deleteDocument(docId);
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Knowledge Base & RAG Documents</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage company policy documents indexed into ChromaDB for context-grounded AI generation.
          </p>
        </div>

        {user?.role !== 'customer' && (
          <button
            onClick={() => setTextModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Text Document</span>
          </button>
        )}
      </div>

      {/* Upload Drag & Drop Area (Admins & Supervisors) */}
      {user?.role !== 'customer' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-brand-600" />
            <span>Upload Policy Document (PDF, TXT, DOCX)</span>
          </h2>

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Return & Warranty Policy 2026"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Billing & Payments">Billing & Payments</option>
                  <option value="Account & Access">Account & Access</option>
                  <option value="Shipping & Delivery">Shipping & Delivery</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Product & Feature">Product & Feature</option>
                  <option value="General Policy">General Policy</option>
                </select>
              </div>
            </div>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-brand-500 transition bg-slate-50/50">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.txt,.docx,.md"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    if (!docTitle) setDocTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                <File className="w-8 h-8 text-brand-600" />
                <span className="font-semibold text-slate-800">
                  {file ? file.name : 'Click to browse or drag file here'}
                </span>
                <span className="text-[11px] text-slate-400">
                  Supported formats: PDF, DOCX, TXT (Max 15MB)
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold flex items-center space-x-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{uploading ? 'Extracting, Chunking & Indexing...' : 'Index Document into ChromaDB'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Indexed Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>Indexed Knowledge Documents ({documents.length})</span>
          </h2>
          <span className="text-xs text-slate-500">Vector Store: ChromaDB (HNSW Cosine)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Document Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Chroma Chunks</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded Date</th>
                {user?.role !== 'customer' && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    Loading knowledge base...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No documents indexed yet. Upload a policy document above.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                      <span>{doc.title}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{doc.category}</td>
                    <td className="px-4 py-3.5 uppercase font-mono text-[10px] text-slate-500">
                      {doc.fileType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-brand-600">
                      {doc.chunkCount} chunks
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    {user?.role !== 'customer' && (
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(doc._id, doc.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete from knowledge base"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Text Policy Modal */}
      {textModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Direct Policy Document</h3>
              <button onClick={() => setTextModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectTextSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Priority Support SLA Protocol"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={textCategory}
                  onChange={(e) => setTextCategory(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Billing & Payments">Billing & Payments</option>
                  <option value="Account & Access">Account & Access</option>
                  <option value="Shipping & Delivery">Shipping & Delivery</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="General Policy">General Policy</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Content</label>
                <textarea
                  rows="7"
                  required
                  placeholder="Write or paste the company guidelines, policy terms, and procedure details..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setTextModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingText}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition disabled:opacity-50"
                >
                  {savingText ? 'Chunking & Indexing...' : 'Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
