import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { Toaster } from 'react-hot-toast'

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

