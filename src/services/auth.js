const API = '/api/auth';

// ─── Helper ──────────────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = localStorage.getItem('ssw_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'An unexpected error occurred.');
    error.status = res.status;
    throw error;
  }
  return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function apiSignup(name, email, password) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
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
