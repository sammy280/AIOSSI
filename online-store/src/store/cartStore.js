import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,

      addItem: (product, quantity = 1, note = '') => {
        const items = get().items;
        const existing = items.find(i => i.id === product.id && i.note === note);
        if (existing) {
          set({ items: items.map(i => i.id === product.id && i.note === note ? { ...i, quantity: i.quantity + quantity } : i) });
        } else {
          set({ items: [...items, { ...product, quantity, note }] });
        }
      },

      updateQty: (id, note, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter(i => !(i.id === id && i.note === note)) });
        } else {
          set({ items: get().items.map(i => i.id === id && i.note === note ? { ...i, quantity } : i) });
        }
      },

      removeItem: (id, note) => set({ items: get().items.filter(i => !(i.id === id && i.note === note)) }),

      clearCart: () => set({ items: [], promoCode: null, promoDiscount: 0 }),

      applyPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),

      get subtotal() {
        return get().items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      },
      get itemCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: 'sammy-cart' }
  )
);
