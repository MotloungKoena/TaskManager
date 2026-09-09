import axios from 'axios';

const API_BASE_URL = 'https://localhost:7066/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API calls
export const authApi = {
  register: (userData) => api.post('/Auth/register', userData),
  login: (credentials) => api.post('/Auth/login', credentials),
};

// Projects API calls
export const projectsApi = {
  getAll: () => api.get('/Projects'),
  getById: (id) => api.get(`/Projects/${id}`),
  create: (data) => api.post('/Projects', data),
  update: (id, data) => api.put(`/Projects/${id}`, data),
  delete: (id) => api.delete(`/Projects/${id}`),
  getMembers: (id) => api.get(`/Projects/${id}/members`),
  getAvailableUsers: (id) => api.get(`/Projects/${id}/available-users`),
  addMember: (id, email, role) => api.post(`/Projects/${id}/members`, { email, role }),
  removeMember: (id, memberId) => api.delete(`/Projects/${id}/members/${memberId}`),
};

// Tasks API calls
export const tasksApi = {
  getByProject: (projectId) => api.get(`/Tasks/project/${projectId}`),
  getById: (id) => api.get(`/Tasks/${id}`),
  create: (data) => api.post('/Tasks', data),
  update: (id, data) => api.put(`/Tasks/${id}`, data),
  delete: (id) => api.delete(`/Tasks/${id}`),
  updateStatus: (id, status) => api.patch(`/Tasks/${id}/status`, { status }),
};

// Dashboard API
export const dashboardApi = {
  getSummary: () => api.get('/Dashboard/summary'),
};

export default api;