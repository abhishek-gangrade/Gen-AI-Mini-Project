import React, { useState, useEffect } from 'react';
import { teamAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const TeamManagement = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await teamAPI.getUsers(selectedRole !== 'all' ? { role: selectedRole } : {});
      if (res.data?.success) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      const res = await teamAPI.updateRole(targetUserId, { role: newRole });
      if (res.data?.success) {
        setMessage(`Role updated to ${newRole} successfully.`);
        setTimeout(() => setMessage(''), 3000);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team & User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Role-Based Access Control (RBAC) across Administrators, Supervisors, Support Agents, and Customers.
          </p>
        </div>

        {/* Filter Role */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="supervisor">Supervisors</option>
            <option value="agent">Support Agents</option>
            <option value="customer">Customers</option>
          </select>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">User</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Current Role</th>
                <th className="px-6 py-3.5">Status</th>
                {user?.role === 'admin' && <th className="px-6 py-3.5 text-right">Assign Role</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-semibold text-slate-900 flex items-center space-x-3">
                      {u.avatar ? (
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {u.name.charAt(0)}
                        </div>
                      )}
                      <span>{u.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4 text-slate-600">{u.department || 'Support'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'supervisor'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'agent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
                        >
                          <option value="admin">Admin</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="agent">Support Agent</option>
                          <option value="customer">Customer</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
