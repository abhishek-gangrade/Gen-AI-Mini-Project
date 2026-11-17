import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('resolveai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  getDemoAccounts: () => api.get('/auth/demo-accounts'),
};

export const ticketsAPI = {
  getTickets: (params) => api.get('/tickets', { params }),
  getTicketById: (id) => api.get(`/tickets/${id}`),
  createTicket: (data) => api.post('/tickets', data),
  updateTicket: (id, data) => api.patch(`/tickets/${id}`, data),
  escalateTicket: (id, data) => api.post(`/tickets/${id}/escalate`, data),
  overrideAnalysis: (id, data) => api.patch(`/tickets/${id}/override-analysis`, data),
};

export const messagesAPI = {
  sendMessage: (data) => api.post('/messages', data),
  getConversationSummary: (ticketId) => api.get(`/messages/summary/${ticketId}`),
};

export const knowledgeAPI = {
  getDocuments: () => api.get('/knowledge'),
  uploadDocument: (formData) => api.post('/knowledge/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  createDirect: (data) => api.post('/knowledge/direct', data),
  deleteDocument: (id) => api.delete(`/knowledge/${id}`),
  testQuery: (data) => api.post('/knowledge/test-query', data),
};

export const aiAPI = {
  generateDraft: (data) => api.post('/ai/draft-response', data),
  approveResponse: (data) => api.post('/ai/approve-response', data),
  getKnowledgeGaps: () => api.get('/ai/knowledge-gaps'),
  classifyText: (data) => api.post('/ai/classify', data),
};

export const analyticsAPI = {
  getDashboardMetrics: () => api.get('/analytics/dashboard'),
  exportCSV: () => api.get('/analytics/export-csv', { responseType: 'blob' }),
};

export const teamAPI = {
  getUsers: (params) => api.get('/team/users', { params }),
  getAgents: () => api.get('/team/agents'),
  updateRole: (userId, data) => api.patch(`/team/users/${userId}/role`, data),
};

export default api;
