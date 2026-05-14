import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // login is an alias for setAuth for convenience
      login: (token, user) => {
        console.log('AuthStore: Storing new token and user');
        set({ token, user, isAuthenticated: true });
      },

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        console.log('AuthStore: Logging out, clearing token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      isTokenValid: () => {
        const { token } = get();
        if (!token) return false;
        try {
          const { exp } = jwtDecode(token);
          return Date.now() < exp * 1000;
        } catch {
          return false;
        }
      },

      updateUser: (updates) => {
        set((state) => ({ user: { ...state.user, ...updates } }));
      },
    }),
    { name: 'ai-examiner-auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
);

export default useAuthStore;
