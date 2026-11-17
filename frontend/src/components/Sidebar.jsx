import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Ticket,
  Bot,
  BookOpen,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  AlertCircle
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role || 'customer';

  const navItems = [
    {
      name: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'supervisor', 'agent', 'customer'],
    },
    {
      name: role === 'customer' ? 'My Tickets' : 'Tickets',
      path: '/tickets',
      icon: Ticket,
      roles: ['admin', 'supervisor', 'agent', 'customer'],
    },
    {
      name: 'AI Assistant',
      path: '/ai-assistant',
      icon: Bot,
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      name: 'Knowledge Base',
      path: '/knowledge-base',
      icon: BookOpen,
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      name: 'Conversations',
      path: '/conversations',
      icon: MessageSquare,
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
      roles: ['admin', 'supervisor', 'agent'],
    },
    {
      name: 'Team Management',
      path: '/team',
      icon: Users,
      roles: ['admin', 'supervisor'],
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      roles: ['admin', 'supervisor'],
    },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Support Studio
        </div>
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/5'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Model & AI engine status footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-700 font-semibold">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI RAG Engine</span>
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
            ACTIVE
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          ChromaDB persistent vector store & local grounded synthesis.
        </div>
      </div>
    </aside>
  );
};
