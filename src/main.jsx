import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { Toaster } from 'react-hot-toast'

// ── Browser Session Key Management & Transparent Encryption/Decryption ──────
(function() {
  const getSessionKey = () => {
    let key = sessionStorage.getItem('ssw_session_key');
    if (!key) {
      key = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('ssw_session_key', key);
    }
    return key;
  };

  const encryptData = (text, key) => {
    if (!text) return '';
    const keyStr = String(key);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const keyChar = keyStr.charCodeAt(i % keyStr.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    try {
      return btoa(unescape(encodeURIComponent(result)));
    } catch (e) {
      return '';
    }
  };

  const decryptData = (encoded, key) => {
    if (!encoded) return '';
    try {
      const keyStr = String(key);
      const text = decodeURIComponent(escape(atob(encoded)));
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const keyChar = keyStr.charCodeAt(i % keyStr.length);
        result += String.fromCharCode(charCode ^ keyChar);
      }
      return result;
    } catch (e) {
      return '';
    }
  };

  const originalGetItem = localStorage.getItem;
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;

  const targetKeys = ['ssw_token', 'ssw_user_email', 'ssw_user'];

  localStorage.getItem = function(key) {
    if (targetKeys.includes(key)) {
      const encVal = originalGetItem.call(localStorage, key + '_enc');
      if (encVal) {
        return decryptData(encVal, getSessionKey());
      }
      const plainVal = originalGetItem.call(localStorage, key);
      if (plainVal) {
        // Automatically migrate plain value to encrypted
        const sessionKey = getSessionKey();
        originalSetItem.call(localStorage, key + '_enc', encryptData(plainVal, sessionKey));
        originalRemoveItem.call(localStorage, key);
        return plainVal;
      }
      return null;
    }
    return originalGetItem.apply(this, arguments);
  };

  localStorage.setItem = function(key, value) {
    if (targetKeys.includes(key)) {
      if (value === null || value === undefined) {
        originalRemoveItem.call(localStorage, key + '_enc');
        originalRemoveItem.call(localStorage, key);
        return;
      }
      const sessionKey = getSessionKey();
      const encrypted = encryptData(value, sessionKey);
      originalSetItem.call(localStorage, key + '_enc', encrypted);
      originalRemoveItem.call(localStorage, key);
      return;
    }
    return originalSetItem.apply(this, arguments);
  };

  localStorage.removeItem = function(key) {
    if (targetKeys.includes(key)) {
      originalRemoveItem.call(localStorage, key + '_enc');
      originalRemoveItem.call(localStorage, key);
      return;
    }
    return originalRemoveItem.apply(this, arguments);
  };
})();

const decryptVal = (encoded, key) => {
  if (!encoded) return '';
  try {
    const raw = atob(encoded);
    const keyStr = String(key);
    const result = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      result[i] = raw.charCodeAt(i) ^ keyStr.charCodeAt(i % keyStr.length);
    }
    return new TextDecoder().decode(result);
  } catch (e) {
    console.error("Decryption failed:", e);
    return '';
  }
};

// ── Global Fetch Interceptor for X-Starlit-Key Hardening & Transparent Decryption ──
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  let isBackendUrl = false;
  if (
    typeof url === 'string' &&
    (url.startsWith('/api/') || url.startsWith('http://localhost:5504/api/') || url.includes('/api/')) &&
    !url.includes('ipapi.co')
  ) {
    isBackendUrl = true;
  }

  const headers = {
    ...options.headers,
    ...(isBackendUrl ? { 'X-Starlit-Key': import.meta.env.VITE_STARLIT_KEY || atob('YzlmMmU4YTFkNGI3NjMwZWY1MWM5YThiM2QyZTdmMDQ2NWExYzhkOWIzZjJlN2EwNDZjNWQ4ZjFhMmIzZTRjNw==') } : {})
  };

  const response = await originalFetch(url, { ...options, headers });

  if (isBackendUrl) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const clonedResponse = response.clone();
      try {
        const json = await clonedResponse.json();
        let modified = false;

        const decryptDetails = (userObj) => {
          if (userObj && userObj.details_enc && typeof userObj.details === 'string') {
            const key = import.meta.env.VITE_STARLIT_KEY || '';
            const decrypted = decryptVal(userObj.details, key);
            userObj.details = decrypted;
            delete userObj.details_enc;
            return true;
          }
          return false;
        };

        // Case 1: single user object: { user: { details: '...', details_enc: true } }
        if (json.user) {
          if (decryptDetails(json.user)) modified = true;
        }
        // Case 2: list of users or other lists: [ { details: '...', details_enc: true }, ... ]
        if (Array.isArray(json)) {
          json.forEach(item => {
            if (decryptDetails(item)) modified = true;
          });
        }
        // Case 3: nested structures
        for (const key in json) {
          if (Array.isArray(json[key])) {
            json[key].forEach(item => {
              if (decryptDetails(item)) modified = true;
            });
          } else if (typeof json[key] === 'object' && json[key] !== null) {
            if (decryptDetails(json[key])) modified = true;
          }
        }

        if (modified) {
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        console.error("Transparent decryption interceptor error:", e);
      }
    }
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <CartProvider>
          <Toaster position="bottom-right" toastOptions={{ style: { background: '#0A0A0A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
          <App />
        </CartProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
)

