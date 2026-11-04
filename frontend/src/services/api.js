import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const borrowedService = {
  getBorrowed: async (params = {}) => {
    const res = await api.get('/borrowed', { params });
    return res.data;
  },
  createBorrowed: async (borrowedData) => {
    const res = await api.post('/borrowed', borrowedData);
    return res.data;
  },
  updateBorrowed: async (id, borrowedData) => {
    const res = await api.put(`/borrowed/${id}`, borrowedData);
    return res.data;
  },
  deleteBorrowed: async (id) => {
    const res = await api.delete(`/borrowed/${id}`);
    return res.data;
  },
  bulkUpdateStatus: async (ids, status) => {
    const res = await api.post('/borrowed/bulk-status', { ids, status });
    return res.data;
  },
  bulkDelete: async (ids) => {
    const res = await api.post('/borrowed/bulk-delete', { ids });
    return res.data;
  },
};


export default api;
