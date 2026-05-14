import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, LayoutDashboard, FileText, BookOpen, Users, BarChart3,
  Bell, Settings, LogOut, ChevronLeft, ChevronRight, Menu, X, Star
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { teacherAPI } from '../../services/api';

const NAV_ITEMS = [
  { to: '/teacher', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/teacher/exams', icon: BookOpen, label: 'Exams' },
  { to: '/teacher/submissions', icon: FileText, label: 'Submissions' },
  { to: '/teacher/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/teacher/notifications', icon: Bell, label: 'Notifications', badge: true },
  { to: '/teacher/settings', icon: Settings, label: 'Settings' },
];

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { unreadCount, setNotifications } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    teacherAPI.getNotifications().then(({ data }) => setNotifications(data.data)).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b ${collapsed ? 'justify-center' : ''}`} style={{ borderColor: 'var(--border)' }}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-glow-primary">
          <Brain className="w-5 h-5 text-white" />
        </div>
        {!collapsed && <span className="font-display font-bold text-base gradient-text">AI Examiner</span>}
      </div>

      {/* User Badge */}
      {!collapsed && (
        <div className="mx-3 my-3 p-3 rounded-xl" style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}>
            <div className="relative flex-shrink-0">
              <item.icon className="w-5 h-5" />
              {item.badge && unreadCount > 0 && <span className="notif-dot" />}
            </div>
            {!collapsed && <span className="text-sm">{item.label}</span>}
            {!collapsed && item.badge && unreadCount > 0 && (
              <span className="ml-auto badge-danger text-xs">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button onClick={handleLogout} className={`sidebar-item w-full text-red-400 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Desktop Sidebar */}
      <motion.aside animate={{ width: collapsed ? 72 : 240 }} transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col flex-shrink-0 border-r overflow-hidden relative"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {collapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronLeft className="w-3 h-3 text-gray-400" />}
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 border-r md:hidden"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 h-14 border-b flex-shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-400 hover:text-gray-200">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <NavLink to="/teacher/notifications" className="relative text-gray-400 hover:text-gray-200 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="notif-dot" />}
          </NavLink>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer" onClick={() => navigate('/teacher/settings')}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
