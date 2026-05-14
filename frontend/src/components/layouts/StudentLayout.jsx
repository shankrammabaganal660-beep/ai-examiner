import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, BookOpen, FileText, BarChart3,
  Bell, Settings, LogOut, Menu, Trophy
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { studentAPI } from '../../services/api';

const NAV_ITEMS = [
  { to: '/student', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/student/exams', icon: BookOpen, label: 'Available Exams' },
  { to: '/student/results', icon: FileText, label: 'My Results' },
  { to: '/student/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/student/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/student/settings', icon: Settings, label: 'Settings' },
];

export default function StudentLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { unreadCount, setNotifications } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    studentAPI.getNotifications().then(({ data }) => setNotifications(data.data)).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-base gradient-text-blue">AI Examiner</span>
      </div>
      <div className="mx-3 my-3 p-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.rollNumber || user?.semester || 'Student'}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <div className="relative flex-shrink-0">
              <item.icon className="w-5 h-5" />
              {item.badge && unreadCount > 0 && <span className="notif-dot" />}
            </div>
            <span className="text-sm">{item.label}</span>
            {item.badge && unreadCount > 0 && <span className="ml-auto badge-danger text-xs">{unreadCount}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-400 hover:bg-red-500/10">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 border-r" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed left-0 top-0 bottom-0 w-64 z-50 border-r md:hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 h-14 border-b flex-shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-400"><Menu className="w-5 h-5" /></button>
          <div className="flex-1" />
          <NavLink to="/student/notifications" className="relative text-gray-400 hover:text-gray-200">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="notif-dot" />}
          </NavLink>
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
