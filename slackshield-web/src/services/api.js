import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('slackshield_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors (redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('slackshield_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const workspaceAPI = {
  getAll: () => api.get('/workspaces'),
  disconnect: (workspaceId) => api.delete(`/workspaces/${workspaceId}`)
}

export const scheduleAPI = {
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/schedules`),
  create: (workspaceId, schedule) => api.post(`/workspaces/${workspaceId}/schedules`, schedule),
  update: (scheduleId, schedule) => api.put(`/schedules/${scheduleId}`, schedule),
  delete: (scheduleId) => api.delete(`/schedules/${scheduleId}`)
}

export const violationAPI = {
  getAll: (workspaceId, params) => api.get(`/workspaces/${workspaceId}/violations`, { params }),
  getStats: (workspaceId) => api.get(`/workspaces/${workspaceId}/violations/stats`)
}

export const templateAPI = {
  getAll: (workspaceId) => api.get(`/workspaces/${workspaceId}/templates`),
  create: (workspaceId, template) => api.post(`/workspaces/${workspaceId}/templates`, template),
  update: (templateId, template) => api.put(`/templates/${templateId}`, template),
  setDefault: (templateId) => api.put(`/templates/${templateId}/default`)
}

export default api
