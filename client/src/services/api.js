import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mq_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// ── Hospitals ─────────────────────────────────────────────────────────────────
export const hospitalsAPI = {
  search: (params) => api.get('/hospitals', { params }),
  get: (id) => api.get(`/hospitals/${id}`),
  create: (data) => api.post('/hospitals', data),
  update: (id, data) => api.patch(`/hospitals/${id}`, data),
  getDoctors: (id, params) => api.get(`/hospitals/${id}/doctors`, { params }),
  getStats: (id) => api.get(`/hospitals/${id}/stats`),
};

// ── Doctors ───────────────────────────────────────────────────────────────────
export const doctorsAPI = {
  list: (params) => api.get('/doctors', { params }),
  get: (id) => api.get(`/doctors/${id}`),
  update: (id, data) => api.patch(`/doctors/${id}`, data),
  delete: (id) => api.delete(`/doctors/${id}`),
};

// ── Slots ─────────────────────────────────────────────────────────────────────
export const slotsAPI = {
  getByDoctor: (doctorId) => api.get(`/slots/${doctorId}`),
  create: (data) => api.post('/slots', data),
  update: (id, data) => api.patch(`/slots/${id}`, data),
  delete: (id) => api.delete(`/slots/${id}`),
  getAvailable: (doctorId, date) =>
    api.get('/appointments/available-slots', { params: { doctorId, date } }),
};

// ── Appointments ──────────────────────────────────────────────────────────────
export const appointmentsAPI = {
  list: (params) => api.get('/appointments', { params }),
  get: (id) => api.get(`/appointments/${id}`),
  book: (data) => api.post('/appointments', data),
  walkIn: (data) => api.post('/appointments/walkin', data),
  checkinQR: (qrToken) => api.post(`/appointments/checkin/${qrToken}`),
  cancel: (id, data) => api.patch(`/appointments/${id}/cancel`, data),
};

// ── Queue ─────────────────────────────────────────────────────────────────────
export const queueAPI = {
  today: (doctorId) => api.get(`/queue/today/${doctorId}`),
  callNext: (doctorId) => api.patch('/queue/call-next', { doctorId }),
  call: (appointmentId) => api.patch(`/queue/call/${appointmentId}`),
  complete: (appointmentId, action = 'done') =>
    api.patch('/queue/complete', { appointmentId, action }),
  delay: (doctorId, delayMinutes, reason) =>
    api.patch('/queue/delay', { doctorId, delayMinutes, reason }),
};

// ── Medical Records ───────────────────────────────────────────────────────────
export const recordsAPI = {
  create: (data) => api.post('/records', data),
  update: (id, data) => api.patch(`/records/${id}`, data),
  byPatient: (patientId) => api.get(`/records/patient/${patientId}`),
  byAppointment: (appointmentId) => api.get(`/records/appointment/${appointmentId}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsAPI = {
  submit: (data) => api.post('/reviews', data),
  byDoctor: (doctorId, params) => api.get(`/reviews/doctor/${doctorId}`, { params }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  summary: (params) => api.get('/analytics/summary', { params }),
  specialties: (params) => api.get('/analytics/specialties', { params }),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiAPI = {
  suggestSpecialty: (symptoms) => api.post('/ai/suggest-specialty', { symptoms }),
  checkInteractions: (medications) => api.post('/ai/drug-interactions', { medications }),
  summarizeReviews: (doctorId) => api.post('/ai/summarize-reviews', { doctorId }),
  adminInsight: (data) => api.post('/ai/admin-insight', data),
  chat: (messages) => api.post('/ai/chat', { messages }),
};
