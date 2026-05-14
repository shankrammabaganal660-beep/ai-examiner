import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => {
    const unread = notifications.filter(n => !n.isRead).length;
    set({ notifications, unreadCount: unread });
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
  },
}));

export default useNotificationStore;
