import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
}

export const mediaAPI = {
  search:   (q, type = '') => api.get('/media/search', { params: { q, type } }),
  addMedia: (data)         => api.post('/media', data),
  getMedia: (id)           => api.get(`/media/${id}`),
}

export const watchlistAPI = {
  getAll:  (params) => api.get('/watchlist', { params }),
  upsert:  (data)   => api.post('/watchlist', data),
  remove:  (id)     => api.delete(`/watchlist/${id}`),
}

export const analyticsAPI = {
  getSummary: () => api.get('/analytics'),
}
