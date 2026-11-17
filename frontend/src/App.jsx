import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Tickets } from './pages/Tickets';
import { TicketDetail } from './pages/TicketDetail';
import { AIAssistant } from './pages/AIAssistant';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Conversations } from './pages/Conversations';
import { Analytics } from './pages/Analytics';
import { TeamManagement } from './pages/TeamManagement';
import { Settings } from './pages/Settings';

const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
