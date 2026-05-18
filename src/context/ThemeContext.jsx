import { createContext, useContext, useState, useEffect } from 'react';

// ── Theme Definitions ─────────────────────────────────────────────────────────
export const THEMES = {
  midnight: {
    label: 'Midnight',
    icon: '🌑',
    '--color-brand-bg':       '#050505',
    '--color-brand-card':     '#0a0a0c',
    '--color-brand-border':   '#1a1a20',
    '--color-brand-primary':  '#7c3aed',
    '--color-brand-secondary':'#3b82f6',
    '--color-brand-text':     '#ffffff',
    '--color-brand-subtext':  '#9ca3af',
    '--body-bg':              '#050505',
    '--glow-1': 'rgba(124,58,237,0.15)',
    '--glow-2': 'rgba(59,130,246,0.10)',
  },
  snow: {
    label: 'Snow',
    icon: '❄️',
    '--color-brand-bg':       '#f0f2f8',
    '--color-brand-card':     '#ffffff',
    '--color-brand-border':   '#dde2ef',
    '--color-brand-primary':  '#6d28d9',
    '--color-brand-secondary':'#2563eb',
    '--color-brand-text':     '#0f0f1a',
    '--color-brand-subtext':  '#6b7280',
    '--body-bg':              '#f0f2f8',
    '--glow-1': 'rgba(109,40,217,0.08)',
    '--glow-2': 'rgba(37,99,235,0.06)',
  },
  cobalt: {
    label: 'Cobalt',
    icon: '🔷',
    '--color-brand-bg':       '#060d1f',
    '--color-brand-card':     '#0d1a35',
    '--color-brand-border':   '#1e3560',
    '--color-brand-primary':  '#3b82f6',
    '--color-brand-secondary':'#06b6d4',
    '--color-brand-text':     '#e2e8f0',
    '--color-brand-subtext':  '#94a3b8',
    '--body-bg':              '#060d1f',
    '--glow-1': 'rgba(59,130,246,0.18)',
    '--glow-2': 'rgba(6,182,212,0.12)',
  },
  amber: {
    label: 'Amber',
    icon: '🟡',
    '--color-brand-bg':       '#0d0a00',
    '--color-brand-card':     '#1a1400',
    '--color-brand-border':   '#2e2500',
    '--color-brand-primary':  '#f59e0b',
    '--color-brand-secondary':'#ef4444',
    '--color-brand-text':     '#fef3c7',
    '--color-brand-subtext':  '#a16207',
    '--body-bg':              '#0d0a00',
    '--glow-1': 'rgba(245,158,11,0.15)',
    '--glow-2': 'rgba(239,68,68,0.10)',
  },
  crimson: {
    label: 'Crimson',
    icon: '❤️',
    '--color-brand-bg':       '#0d0005',
    '--color-brand-card':     '#1a000d',
    '--color-brand-border':   '#3d0020',
    '--color-brand-primary':  '#ec4899',
    '--color-brand-secondary':'#f43f5e',
    '--color-brand-text':     '#fce7f3',
    '--color-brand-subtext':  '#9f1239',
    '--body-bg':              '#0d0005',
    '--glow-1': 'rgba(236,72,153,0.15)',
    '--glow-2': 'rgba(244,63,94,0.10)',
  },
};

// ── Currency Definitions ───────────────────────────────────────────────────────
export const CURRENCIES = {
  INR: { symbol: '₹', label: 'INR', rate: 1 },
  USD: { symbol: '$', label: 'USD', rate: 0.012 },
  EUR: { symbol: '€', label: 'EUR', rate: 0.011 },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ssw_theme') || 'midnight');
  const [currency, setCurrency] = useState(() => localStorage.getItem('ssw_currency') || 'INR');

  const applyTheme = (name) => {
    const vars = THEMES[name] || THEMES.midnight;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, val]) => {
      if (key.startsWith('--')) root.style.setProperty(key, val);
    });
    // Also update body background
    document.body.style.backgroundColor = vars['--body-bg'];
    document.documentElement.setAttribute('data-theme', name);
  };

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('ssw_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('ssw_currency', currency);
  }, [currency]);

  /**
   * Convert an INR price to the selected display currency.
   * Payments always remain in INR; this is for display only.
   */
  const convertPrice = (inrAmount) => {
    const pathname = window.location.pathname.toLowerCase();
    const isConvertiblePage = pathname.includes('/shop') || pathname.includes('/history') || pathname.includes('/invoice/');
    
    if (!isConvertiblePage) {
      // Force INR formatting for all other pages
      return `₹${Number(inrAmount || 0).toLocaleString('en-IN')}`;
    }

    const curr = CURRENCIES[currency] || CURRENCIES.INR;
    const converted = inrAmount * curr.rate;
    return `${curr.symbol}${currency === 'INR' ? converted.toLocaleString('en-IN') : converted.toFixed(2)}`;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currency, setCurrency, convertPrice, themes: THEMES, currencies: CURRENCIES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
