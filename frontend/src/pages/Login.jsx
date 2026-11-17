import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldAlert,
  Building,
  KeyRound
} from 'lucide-react';

export const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register({ name, email, password, role });
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Registration failed');
        }
      } else {
        const res = await login(email, password);
        if (res.success) {
          navigate('/');
        } else {
          setError(res.error || 'Invalid email or password');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setError('');
    setLoading(true);
    try {
      const res = await switchDemoRole(demoEmail, demoPass);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Demo login failed');
      }
    } catch (err) {
      setError(err.message || 'Demo login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Logo size="lg" showText={true} className="justify-center" />
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Quick Demo Access (1-Click Login)</span>
              <span className="text-[10px] text-brand-600 bg-brand-50 px-2 py-0.5 rounded font-bold">PRE-SEEDED</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin@technova.com', 'adminpassword123')}
                className="p-2.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-left transition group"
              >
                <div className="text-[10px] font-bold uppercase text-purple-700">Admin</div>
                <div className="text-xs font-semibold text-slate-800">Sarah Chen</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('supervisor@technova.com', 'supervisorpassword123')}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-left transition group"
              >
                <div className="text-[10px] font-bold uppercase text-blue-700">Supervisor</div>
                <div className="text-xs font-semibold text-slate-800">Marcus Vance</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('agent@technova.com', 'agentpassword123')}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-left transition group"
              >
                <div className="text-[10px] font-bold uppercase text-emerald-700">Support Agent</div>
                <div className="text-xs font-semibold text-slate-800">Alex Rivera</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin('customer@gmail.com', 'customerpassword123')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 text-left transition group"
              >
                <div className="text-[10px] font-bold uppercase text-amber-700">Customer</div>
                <div className="text-xs font-semibold text-slate-800">David Miller</div>
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white"
                >
                  <option value="customer">Customer (Submit & track tickets)</option>
                  <option value="agent">Support Agent (Review & send AI responses)</option>
                  <option value="supervisor">Supervisor (Escalations & oversight)</option>
                  <option value="admin">Administrator (Full platform configuration)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-500 transition"
            >
              {isRegister
                ? 'Already have an account? Sign in here'
                : "Don't have an account yet? Register here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
