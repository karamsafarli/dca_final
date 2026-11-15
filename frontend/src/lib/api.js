import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/me')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    const message =
      error.response?.data?.error ||
      error.message ||
      'Serverlə əlaqə zamanı xəta baş verdi';
    return Promise.reject(new Error(message));
  }
);
