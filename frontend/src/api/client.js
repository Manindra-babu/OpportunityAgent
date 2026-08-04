import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE !== undefined
  ? import.meta.env.VITE_API_BASE
  : (typeof window !== 'undefined' && window.location.origin.includes('5173')
      ? 'http://localhost:8000'
      : '');

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const requestOTP = async (email) => {
  const res = await api.post('/auth/request-otp', { email });
  return res.data;
};

export const verifyOTPAndSignup = async (payload) => {
  const res = await api.post('/auth/verify-otp-signup', payload);
  return res.data;
};

export const signup = async (payload) => {
  const res = await api.post('/auth/signup', payload);
  return res.data;
};

export const login = async (payload) => {
  const res = await api.post('/auth/login', payload);
  return res.data;
};

export const logout = async () => {
  const res = await api.post('/auth/logout');
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const getCredentialsStatus = async () => {
  const res = await api.get('/credentials/status');
  return res.data;
};

export const saveGroqKey = async (groq_api_key) => {
  const res = await api.post('/credentials/groq', { groq_api_key });
  return res.data;
};

export const deleteGroqKey = async () => {
  const res = await api.delete('/credentials/groq');
  return res.data;
};

export const startGmailOAuth = async () => {
  const res = await api.get('/credentials/gmail/oauth/start');
  return res.data;
};

export const deleteGmail = async () => {
  const res = await api.delete('/credentials/gmail');
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get('/profile');
  return res.data;
};

export const uploadResume = async (formData) => {
  const res = await api.post('/profile/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const syncGithub = async (githubUsername) => {
  const formData = new FormData();
  formData.append('github_username', githubUsername);
  const res = await api.post('/profile/github', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const getOpportunities = async (params = {}) => {
  const res = await api.get('/opportunities', { params });
  return res.data;
};

export const triggerDiscovery = async () => {
  const res = await api.post('/opportunities/trigger-discovery');
  return res.data;
};

export const manualAction = async (payload) => {
  const res = await api.post('/opportunities/manual-action', payload);
  return res.data;
};

export const getNews = async () => {
  const res = await api.get('/news');
  return res.data;
};

export const refreshNews = async () => {
  const res = await api.post('/news/refresh');
  return res.data;
};

export const getSettings = async () => {
  const res = await api.get('/settings');
  return res.data;
};

export const updateThreshold = async (threshold) => {
  const res = await api.post('/settings/threshold', { threshold });
  return res.data;
};

export const getActivityLogs = async () => {
  const res = await api.get('/activity');
  return res.data;
};

export const getFailureMemory = async () => {
  const res = await api.get('/activity/failure-memory');
  return res.data;
};

export const getMetrics = async () => {
  const res = await api.get('/activity/metrics');
  return res.data;
};

export const submitUserFix = async (payload) => {
  const res = await api.post('/activity/user-fix', payload);
  return res.data;
};
