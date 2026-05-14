import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { UserPlus, Search, CheckCircle, XCircle, Trash2, Shield, BookOpen, GraduationCap, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_ICON = { admin: Shield, teacher: BookOpen, examiner: BookOpen, student: GraduationCap };
const ROLE_COLOR = { admin: 'badge-danger', teacher: 'badge-primary', examiner: 'badge-primary', student: 'badge-success' };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({ page, limit: 15, search, role: roleFilter || undefined });
      setUsers(data.data);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  const handleApprove = async (id) => {
    await adminAPI.approveUser(id);
    toast.success('User approved');
    fetchUsers();
  };

  const handleToggle = async (id) => {
    await adminAPI.toggleActive(id);
    toast.success('Status updated');
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    await adminAPI.deleteUser(id);
    toast.success('User deleted');
    fetchUsers();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-100">Users</h1>
          <p className="text-sm text-gray-500">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="Search by name or email..." />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-full sm:w-40">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="examiner">Examiner</option>
          <option value="student">Student</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton h-10 rounded my-1" /></td></tr>
                ))
              ) : users.map((u) => {
                const Icon = ROLE_ICON[u.role] || GraduationCap;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-200">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${ROLE_COLOR[u.role] || 'badge-gray'}`}><Icon className="w-3 h-3" />{u.role}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${u.isApproved ? 'badge-success' : 'badge-warning'}`}>{u.isApproved ? 'Approved' : 'Pending'}</span>
                        <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {!u.isApproved && u.role !== 'student' && (
                          <button onClick={() => handleApprove(u._id)} className="btn-success px-2 py-1 text-xs" title="Approve"><CheckCircle className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => handleToggle(u._id)} className="btn-ghost px-2 py-1 text-xs" title="Toggle Active">
                          {u.isActive ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-gray-500" />}
                        </button>
                        <button onClick={() => handleDelete(u._id)} className="btn-danger px-2 py-1 text-xs" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs text-gray-500">Showing {users.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-xs px-3 py-1.5">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={users.length < 15} className="btn-ghost text-xs px-3 py-1.5">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
