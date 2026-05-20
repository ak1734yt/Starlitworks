const API = '/api/auth';

// ─── Helper ──────────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = localStorage.getItem('ssw_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Starlit-Key': import.meta.env.VITE_STARLIT_KEY || atob('U3RhcmxpdF9TaWVnZV9Xb3Jrc19WMl8yMDI2X1NlY3VyZV9LZXk='),
      ...options.headers,
    },
    ...options,
  });
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'An unexpected error occurred.');
      error.status = res.status;
      throw error;
    }
    return data;
  } else {
    const text = await res.text();
    if (!res.ok) {
      if (text.includes('An error occurred')) {
         throw new Error('Backend Server is currently offline or unreachable.');
      }
      throw new Error(`Server Error (${res.status}): ${text || 'An unexpected error occurred.'}`);
    }
    return text;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function apiSignup(name, email, password, referralCode = '') {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, referral_code: referralCode }),
  });
}

export async function apiVerifySignup(email, otp, referralCode = '') {
  return request('/verify-signup', {
    method: 'POST',
    body: JSON.stringify({ email, otp, referral_code: referralCode }),
  });
}

export async function apiResendOTP(email) {
  return request('/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}


export async function apiLogin(email, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiForgotPassword(email) {
  return request('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiGetMe() {
  return request('/me');
}

export async function apiGetOAuthStatus() {
  return request('/status');
}

export async function apiLogin2FA(userId, code) {
  return request('/login/2fa', {
    method: 'POST',
    body: JSON.stringify({ userId, code }),
  });
}

export async function apiSetup2FA() {
  return request('/2fa/setup', { method: 'POST' });
}

export async function apiVerify2FA(code) {
  return request('/2fa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function apiDisable2FA(code) {
  return request('/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// ─── OAuth redirect helpers ───────────────────────────────────────────────────
export function redirectToOAuth(provider) {
  window.location.href = `/api/auth/${provider}`;
}
