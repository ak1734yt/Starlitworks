import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { Toaster } from 'react-hot-toast'

// ── Global Fetch Interceptor for X-Starlit-Key Hardening ─────────────────────
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  if (
    typeof url === 'string' &&
    (url.startsWith('/api/') || url.startsWith('http://localhost:5504/api/') || url.includes('/api/')) &&
    !url.includes('ipapi.co')
  ) {
    const headers = {
      ...options.headers,
      'X-Starlit-Key': import.meta.env.VITE_STARLIT_KEY || 'ssw_super_secret_change_me_in_production'
    };
    return originalFetch(url, { ...options, headers });
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <CartProvider>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#0A0A0A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <App />
      </CartProvider>
    </ToastProvider>
  </StrictMode>
)

