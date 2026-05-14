import axios from 'axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'https://ai-examiner-backend.onrender.com/api',
  timeout: 30000,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  console.log(`[API Request] ${config.url} | Token Present: ${!!token}`);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/admin-login');
    
    if (error.response?.status === 401 && !isAuthRoute) {
      console.warn('Axios Interceptor: 401 Unauthorized detected. Logging out user.');
      useAuthStore.getState().logout();
      // Only reload if it's a protected route that kicked them out
      window.location.href = '/';
    }
    const msg = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({ ...error, message: msg });
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin-login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  approveUser: (id) => api.patch(`/admin/users/${id}/approve`),
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
};

// ── Teacher ──────────────────────────────────────────────────────────────────
export const teacherAPI = {
  // Exams
  getExams: (params) => api.get('/teacher/exams', { params }),
  getExam: (id) => api.get(`/teacher/exams/${id}`),
  createExam: (data) => api.post('/teacher/exams', data),
  updateExam: (id, data) => api.put(`/teacher/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/teacher/exams/${id}`),
  publishExam: (id) => api.patch(`/teacher/exams/${id}/publish`),
  uploadQuestionPaper: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/teacher/exams/${id}/upload-question-paper`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadModelAnswer: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/teacher/exams/${id}/upload-model-answer`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Submissions
  getSubmissions: (params) => api.get('/teacher/submissions', { params }),
  getEvaluations: (submissionId) => api.get(`/teacher/submissions/${submissionId}/evaluations`),
  overrideMarks: (evalId, data) => api.patch(`/teacher/evaluations/${evalId}/override`, data),
  // Analytics
  getAnalytics: () => api.get('/teacher/analytics'),
  // Notifications
  getNotifications: () => api.get('/teacher/notifications'),
  markNotificationRead: (id) => api.patch(`/teacher/notifications/${id}/read`),
  // Question Paper Parsing
  parseQuestionPaper: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/teacher/parse-question-paper', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.loaded * 100 / e.total)) : undefined,
    });
  },
  extractModelAnswers: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/teacher/extract-model-answers', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.loaded * 100 / e.total)) : undefined,
    });
  },
  // Settings
  getSettings: () => api.get('/teacher/settings'),
  updateSettings: (data) => api.patch('/teacher/settings', data),
  changePassword: (data) => api.put('/teacher/change-password', data),
};

// ── Student ──────────────────────────────────────────────────────────────────
export const studentAPI = {
  getExams: (params) => api.get('/student/exams', { params }),
  submitExam: (examId, file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/student/submit/${examId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.loaded * 100 / e.total)) : undefined,
    });
  },
  getSubmissions: () => api.get('/student/submissions'),
  getResult: (id) => api.get(`/student/submissions/${id}/result`),
  requestReEval: (id, reason) => api.post(`/student/submissions/${id}/re-evaluate`, { reason }),
  getAnalytics: () => api.get('/student/analytics'),
  getNotifications: () => api.get('/student/notifications'),
  markAllRead: () => api.patch('/student/notifications/read-all'),
  // Settings
  getSettings: () => api.get('/student/settings'),
  updateSettings: (data) => api.patch('/student/settings', data),
  changePassword: (data) => api.put('/student/change-password', data),
};

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiAPI = {
  getStatus: (submissionId) => api.get(`/ai/status/${submissionId}`),
  reEvaluate: (submissionId) => api.post(`/ai/re-evaluate/${submissionId}`),
  getAIHealth: () => api.get('/ai/health'),
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  getSubmissionReport: (id) => api.get(`/reports/submission/${id}`),
  getExamReport: (id) => api.get(`/reports/exam/${id}`),
};

export default api;
