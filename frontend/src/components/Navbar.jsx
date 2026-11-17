import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import {
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Layers,
  Building2
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const demoRoles = [
    { label: 'Admin (Sarah Chen)', email: 'admin@technova.com', pass: 'adminpassword123', badge: 'Admin', color: 'bg-purple-100 text-purple-800' },
    { label: 'Supervisor (Marcus Vance)', email: 'supervisor@technova.com', pass: 'supervisorpassword123', badge: 'Supervisor', color: 'bg-blue-100 text-blue-800' },
    { label: 'Support Agent (Alex Rivera)', email: 'agent@technova.com', pass: 'agentpassword123', badge: 'Agent', color: 'bg-emerald-100 text-emerald-800' },
    { label: 'Customer (David Miller)', email: 'customer@gmail.com', pass: 'customerpassword123', badge: 'Customer', color: 'bg-amber-100 text-amber-800' },
  ];

  const handleRoleSelect = async (demo) => {
    setSwitching(true);
    setRoleSwitcherOpen(false);
    try {
      await switchDemoRole(demo.email, demo.pass);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const roleBadgeColor = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
    agent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    customer: 'bg-amber-100 text-amber-700 border-amber-200',
  }[user?.role] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Organization */}
      <div className="flex items-center space-x-4">
        <Logo size="md" />

        <div className="h-6 w-[1px] bg-slate-200 hidden md:block" />

        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium text-slate-700">TechNova Global</span>
        </div>
      </div>

      {/* Right Controls: Role Switcher & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Quick Demo Switcher */}
        <div className="relative">
          <button
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            disabled={switching}
            className="flex items-center space-x-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
            title="Switch demo persona to test RBAC roles"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${switching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Role Switcher:</span>
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${roleBadgeColor}`}>
              {user?.role?.toUpperCase()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Demo Persona
              </div>
              {demoRoles.map((demo) => (
                <button
                  key={demo.badge}
                  onClick={() => handleRoleSelect(demo)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between transition ${
                    user?.role === demo.badge.toLowerCase() ? 'bg-brand-50/60 font-medium' : ''
                  }`}
                >
                  <span className="text-slate-800">{demo.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${demo.color}`}>
                    {demo.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar & Logout */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.name}</div>
              <div className="text-[11px] text-slate-500 capitalize">{user?.role}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
