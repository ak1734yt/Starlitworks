const API = '/api';

export async function request(path, options = {}) {
  const token = localStorage.getItem('ssw_token');
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Starlit-Key': import.meta.env.VITE_STARLIT_KEY || 'b3b985dfebb6061ef6c960d20dbf0cfea3e56a2f34675a0755f32204a37491ca7c69faec1605e42bcafc7d90f91bab7160ce3291bbeef94449155427f695457c',
      ...options.headers,
    },
    ...options,
  });

  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'An unexpected error occurred.');
    return data;
  } else {
    const text = await res.text();
    if (!res.ok) {
      const url = `${API}${path}`;
      // If it's HTML, it might be a 404/500 from the proxy or server
      if (text.includes('<!DOCTYPE html>')) {
        throw new Error(`Server Error (${res.status}) at ${url}: The server returned an HTML page instead of JSON. This usually means the backend is down, the URL is incorrect, or the Vite proxy failed.`);
      }
      throw new Error(`Error (${res.status}) at ${url}: ${text || 'An unexpected error occurred.'}`);
    }
    return text;
  }
}

// Invoices
export const getInvoices = () => request('/invoices');
export const getInvoice = (id) => request(`/invoices/${id}`);
export const saveInvoice = (inv) => request('/invoices', { method: 'POST', body: JSON.stringify(inv) });
export const updateInstallment = (id, index, status) => request(`/invoices/${id}/installment`, { 
  method: 'PATCH', 
  body: JSON.stringify({ index, status }) 
});
export const deleteInvoice = (id) => request(`/invoices/${id}`, { method: 'DELETE' });
export const clearAllInvoices = () => request('/invoices', { method: 'DELETE' });

// Manager
export const getManagerLogs = () => request('/manager/logs');
export const getManagerUsers = () => request('/manager/users');
export const updateUserRole = (id, role) => request(`/manager/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) });
export const getManagerPrices = () => request('/manager/prices');
export const createProduct = (data) => request('/manager/prices', { method: 'POST', body: JSON.stringify(data) });
export const deleteProduct = (id) => request(`/manager/prices/${id}`, { method: 'DELETE' });
export const updatePrice = (id, data) => request(`/manager/prices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const getCoupons = () => request('/manager/coupons');
export const createCoupon = (data) => request('/manager/coupons', { method: 'POST', body: JSON.stringify(data) });
export const getManagerStats = () => request('/manager/stats/activity');
export const getUserDetail = (id) => request(`/manager/users/${id}`);
export const setUserBanned = (id, is_banned) => request(`/manager/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ is_banned }) });
export const getPortfolio = () => request('/portfolio');
export const createPortfolio = (data) => request('/manager/portfolio', { method: 'POST', body: JSON.stringify(data) });
export const deletePortfolio = (id) => request(`/manager/portfolio/${id}`, { method: 'DELETE' });
export const getSiteSettings = () => request('/site/settings');
export const updateSiteSettings = (data) => request('/site/settings', { method: 'POST', body: JSON.stringify(data) });

// Admin / Orders
export const getAdminOrders = () => request('/admin/orders');
export const updateOrderStatus = (id, data) => request(`/admin/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const getAdminFeedbacks = () => request('/admin/feedbacks');
export const updateFeedbackStatus = (id, status) => request(`/admin/feedbacks/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
export const verifyPayment = (id, approved) => request(`/admin/orders/${id}/verify-payment`, { method: 'PUT', body: JSON.stringify({ approved }) });
export const updateOrderVault = (id, vault_data) => request(`/admin/orders/${id}/vault`, { method: 'PUT', body: JSON.stringify({ vault_data }) });

// Client Orders & Negotiation
export const getMyOrders = () => request('/orders/mine');
export const createOrder = (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) });
export const negotiateOrder = (id, data) => request(`/orders/${id}/negotiate`, { method: 'POST', body: JSON.stringify(data) });
export const acceptOrder = (id) => request(`/orders/${id}/accept`, { method: 'POST' });
export const getOrder = (id) => request(`/orders/${id}`);
export const submitPaymentProof = (id, data) => request(`/orders/${id}/payment-proof`, { method: 'POST', body: JSON.stringify(data) });
export const generateQR = (data) => request(`/payment/qr`, { method: 'POST', body: JSON.stringify(data) });

// Chat
export const getChatMessages = (userId) => request(`/chat/user/${userId}`);
export const sendChatMessage = (userId, data) => request(`/chat/user/${userId}`, { method: 'POST', body: JSON.stringify(data) });

// Feedback & Coupons
export const getFeedbacks = () => request('/feedbacks');
export const submitFeedback = (data) => request('/feedbacks', { method: 'POST', body: JSON.stringify(data) });
export const validateCoupon = (code) => request(`/coupons/${code}`);
export const getPublicPrices = () => request('/prices');
export const getPublicStats = () => request('/public/stats');
export const updateProfile = (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) });

// Admin Invoice Management
export const createUserInvoice = (data) => request('/admin/invoices/user', { method: 'POST', body: JSON.stringify(data) });
export const getUserInvoicesByAdmin = (userId) => request(`/invoices/user/${userId}`);
export const deleteOrder = (id) => request(`/admin/orders/${id}`, { method: 'DELETE' });
export const getAnalyticsLogs = () => request('/admin/analytics');
export const adminUpdateInvoiceStatus = (id, status) => request(`/invoices/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const adminNotifyUserInvoice = (id) => request(`/invoices/${id}/notify`, { method: 'POST' });
export const adminEditInvoice = (id, data) => request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const adminAddUserCredits = (userId, amount) => request(`/admin/users/${userId}/credits`, { method: 'POST', body: JSON.stringify({ amount }) });
export const seedCatalog = () => request('/manager/seed-catalog', { method: 'POST' });

// Order Progress Feed
export const getOrderUpdates = (orderId) => request(`/orders/${orderId}/updates`);
export const postOrderUpdate = (orderId, message) => request(`/admin/orders/${orderId}/update`, { method: 'POST', body: JSON.stringify({ message }) });

// Referral System
export const getReferralInfo = () => request('/auth/referral');
export const getManagerReferrals = () => request('/manager/referrals');
export const getManagerReferralSettings = () => request('/manager/referral-settings');
export const updateManagerReferralSettings = (data) => request('/manager/referral-settings', { method: 'PUT', body: JSON.stringify(data) });
export const updateReferralTiers = (tiers) => request('/manager/referral-tiers', { method: 'PUT', body: JSON.stringify({ tiers }) });
export const setUserReferralOverride = (uid, custom_reward) => request(`/manager/users/${uid}/referral-override`, { method: 'PUT', body: JSON.stringify({ custom_reward }) });
export const grantManualBonus = (uid, amount, note) => request(`/manager/users/${uid}/manual-bonus`, { method: 'POST', body: JSON.stringify({ amount, note }) });
export const getUserReferralStats = (uid) => request(`/manager/users/${uid}/referrals`);
export const requestWithdrawal = (amount, payment_info) => request('/referral/withdraw', { method: 'POST', body: JSON.stringify({ amount, payment_info }) });
export const convertReferralPoints = (points) => request('/referral/convert-points', { method: 'POST', body: JSON.stringify({ points }) });
export const getManagerWithdrawals = () => request('/manager/withdrawals');
export const updateWithdrawalStatus = (wid, status, note) => request(`/manager/withdrawals/${wid}`, { method: 'PUT', body: JSON.stringify({ status, note }) });


// Revenue Stats
export const getManagerRevenue = () => request('/manager/revenue');

// Bulk Status Update
export const bulkUpdateOrderStatus = (order_ids, status) => request('/admin/orders/bulk-status', { method: 'PUT', body: JSON.stringify({ order_ids, status }) });

// Notifications
export const getNotifications = () => request('/notifications');
export const markNotificationsRead = () => request('/notifications/read', { method: 'PUT' });
export const managerSendTestEmail = (data) => request('/manager/send-test-email', { method: 'POST', body: JSON.stringify(data) });
export const linkReferralCode = (referral_code) => request('/referral/link', { method: 'POST', body: JSON.stringify({ referral_code }) });
export const lookupReferralCode = (referral_code) => request(`/referral/lookup/${referral_code}`);

