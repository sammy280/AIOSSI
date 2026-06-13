import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initSocket, disconnectSocket } from '../lib/socket';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        localStorage.setItem('erp_token', token);
        localStorage.setItem('erp_user', JSON.stringify(user));
        initSocket(token);
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => set(state => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: 'erp-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
