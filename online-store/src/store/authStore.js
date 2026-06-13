import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      customer: null,
      token: null,
      isAuthenticated: false,
      login: (customer, token) => {
        localStorage.setItem('store_token', token);
        set({ customer, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('store_token');
        set({ customer: null, token: null, isAuthenticated: false });
      },
      updateCustomer: (customer) => set({ customer }),
    }),
    { name: 'store-auth', partialize: s => ({ customer: s.customer, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);
