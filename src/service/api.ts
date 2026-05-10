import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateTo } from './navigationRef';

// Base URL for the API
export const BASE_URL = 'https://mrs.sarvosmi.io/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: attach JWT token ──────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: handle 401 Token Expiry ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      // Token expired or invalid — clear session and redirect to Login
      await AsyncStorage.multiRemove(['userToken', 'userId', 'userRole', 'userInfo']);
      navigateTo('Login');
      // Return a user-friendly rejection so screens can show "Session expired"
      return Promise.reject({
        ...error,
        isSessionExpired: true,
        message: 'Your session has expired. Please login again.',
      });
    }

    return Promise.reject(error);
  }
);

export const getCalendarData = (userId: number, month: string) => {
  return api.get(`/attendance/calendar?userId=${userId}&month=${month}`);
};

export const getAttendanceSummary = (userId: number, month: string) => {
  return api.get(`/attendance/summary?userId=${userId}&month=${month}`);
};

export const getUserProfile = (userId: number) => {
  return api.get(`/users/profile/${userId}`);
};

export default api;
