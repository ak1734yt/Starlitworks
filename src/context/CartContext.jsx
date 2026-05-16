import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  // cart: array of { id, quantity }
  const [cart, setCart] = useState([]);

  const toggleItem = (productId) => {
    setCart(prev =>
      prev.some(i => i.id === productId)
        ? prev.filter(i => i.id !== productId)
        : [...prev, { id: productId, quantity: 1 }]
    );
  };

  const setQuantity = (productId, quantity) => {
    const qty = Math.max(1, Math.min(10000, Number(quantity)));
    setCart(prev =>
      prev.some(i => i.id === productId)
        ? prev.map(i => i.id === productId ? { ...i, quantity: qty } : i)
        : [...prev, { id: productId, quantity: qty }]
    );
  };

  const isSelected = (productId) => cart.some(i => i.id === productId);

  const getQuantity = (productId) => cart.find(i => i.id === productId)?.quantity ?? 1;

  const clearCart = () => setCart([]);

  // For backward compatibility — expose flat id array too
  const cartIds = cart.map(i => i.id);

  return (
    <CartContext.Provider value={{ cart, cartIds, setCart, toggleItem, setQuantity, isSelected, getQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
