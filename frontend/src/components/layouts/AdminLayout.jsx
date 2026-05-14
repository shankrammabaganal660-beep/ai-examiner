import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, LayoutDashboard, Users, LogOut, Menu, Shield } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const NAV = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-base text-gray-100">Admin Panel</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => { logout(); navigate('/'); }} className="sidebar-item w-full text-red-400 hover:bg-red-500/10">
          <LogOut className="w-5 h-5" /><span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <aside className="hidden md:flex flex-col w-56 flex-shrink-0 border-r" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed left-0 top-0 bottom-0 w-56 z-50 border-r md:hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center px-6 h-14 border-b flex-shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-400 mr-4"><Menu className="w-5 h-5" /></button>
          <span className="text-sm font-semibold text-gray-300">System Director</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">{user?.email}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
