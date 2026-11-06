import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer Token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('moneyflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  verifyResetToken: async (token) => {
    const res = await api.get(`/auth/verify-reset-token/${token}`);
    return res.data;
  },
  resetPassword: async ({ token, newPassword }) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};

export const dashboardService = {
  getStats: async () => {
    const res = await api.get('/dashboard/stats');
    return res.data;
  },
};

export const entryService = {
  getEntries: async (params = {}) => {
    const res = await api.get('/entries', { params });
    return res.data;
  },
  getSplitGroupEntries: async (splitGroupId) => {
    const res = await api.get(`/entries/split-group/${splitGroupId}`);
    return res.data;
  },
  createEntry: async (entryData) => {
    const res = await api.post('/entries', entryData);
    return res.data;
  },
  updateEntry: async (id, entryData) => {
    const res = await api.put(`/entries/${id}`, entryData);
    return res.data;
  },
  deleteEntry: async (id) => {
    const res = await api.delete(`/entries/${id}`);
    return res.data;
  },
  bulkUpdateStatus: async (ids, statusOrData) => {
    const payload = typeof statusOrData === 'string' ? { ids, status: statusOrData } : { ids, ...statusOrData };
    const res = await api.post('/entries/bulk-status', payload);
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/entries/bulk-delete', { ids });
    return res.data;
  },
};

export const memberService = {
  checkEmail: async (email) => {
    const res = await api.get('/members/check-email', { params: { email } });
    return res.data;
  },
  getMembers: async (search = '') => {
    const res = await api.get('/members', { params: { search } });
    return res.data;
  },
  createMember: async (memberData) => {
    const res = await api.post('/members', memberData);
    return res.data;
  },
  updateMember: async (id, memberData) => {
    const res = await api.put(`/members/${id}`, memberData);
    return res.data;
  },
  deleteMember: async (id) => {
    const res = await api.delete(`/members/${id}`);
    return res.data;
  },
  getEntriesSummary: async (id) => {
    const res = await api.get(`/members/${id}/entries-summary`);
    return res.data;
  },
  getBulkEntriesSummary: async (ids) => {
    const res = await api.post('/members/bulk-entries-summary', { ids });
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/members/bulk-delete', { ids });
    return res.data;
  },
  sendInvite: async (id) => {
    const res = await api.post(`/members/${id}/invite`);
    return res.data;
  },
  bulkInvite: async (ids) => {
    const res = await api.post('/members/bulk-invite', { ids });
    return res.data;
  },
};

export const userService = {
  getUsers: async (search = '') => {
    const res = await api.get('/users', { params: { search } });
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/users', userData);
    return res.data;
  },
  updateUser: async (id, userData) => {
    const res = await api.put(`/users/${id}`, userData);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
  getEntriesSummary: async (id) => {
    const res = await api.get(`/users/${id}/entries-summary`);
    return res.data;
  },
  getBulkEntriesSummary: async (ids) => {
    const res = await api.post('/users/bulk-entries-summary', { ids });
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/users/bulk-delete', { ids });
    return res.data;
  },
  sendInvite: async (id) => {
    const res = await api.post(`/users/${id}/invite`);
    return res.data;
  },
  bulkInvite: async (ids) => {
    const res = await api.post('/users/bulk-invite', { ids });
    return res.data;
  },
};

export const toPayService = {
  getToPayEntries: async (params = {}) => {
    const res = await api.get('/to-pay', { params });
    return res.data;
  },
  getSplitGroupEntries: async (splitGroupId) => {
    const res = await api.get(`/to-pay/split-group/${splitGroupId}`);
    return res.data;
  },
  createToPayEntry: async (entryData) => {
    const res = await api.post('/to-pay', entryData);
    return res.data;
  },
  updateToPayEntry: async (id, entryData) => {
    const res = await api.put(`/to-pay/${id}`, entryData);
    return res.data;
  },
  deleteToPayEntry: async (id) => {
    const res = await api.delete(`/to-pay/${id}`);
    return res.data;
  },
  bulkUpdateStatus: async (ids, statusOrData) => {
    const payload = typeof statusOrData === 'string' ? { ids, status: statusOrData } : { ids, ...statusOrData };
    const res = await api.post('/to-pay/bulk-status', payload);
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/to-pay/bulk-delete', { ids });
    return res.data;
  },
};

export const forSelfService = {
  getForSelfEntries: async (params = {}) => {
    const res = await api.get('/for-self', { params });
    return res.data;
  },
  createForSelfEntry: async (entryData) => {
    const res = await api.post('/for-self', entryData);
    return res.data;
  },
  updateForSelfEntry: async (id, entryData) => {
    const res = await api.put(`/for-self/${id}`, entryData);
    return res.data;
  },
  deleteForSelfEntry: async (id) => {
    const res = await api.delete(`/for-self/${id}`);
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/for-self/bulk-delete', { ids });
    return res.data;
  },
  bulkUpdateStatus: async (ids, statusData) => {
    const res = await api.post('/for-self/bulk-status', { ids, ...statusData });
    return res.data;
  },
  getSplitGroupEntries: async (splitGroupId) => {
    const res = await api.get(`/entries/split-group/${splitGroupId}`);
    return res.data;
  },
};

export const profileService = {
  getProfile: async () => {
    const res = await api.get('/profile');
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await api.put('/profile', profileData);
    return res.data;
  },
  resetProfile: async () => {
    const res = await api.post('/profile/reset');
    return res.data;
  },
};

export const notificationService = {
  getNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
  deleteNotification: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },
  clearAll: async () => {
    const res = await api.delete('/notifications');
    return res.data;
  },
};

export default api;
