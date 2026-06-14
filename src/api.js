/**
 * API Client - Axios with JWT Authentication
 * Automatically adds Authorization header to all requests
 */

import axios from 'axios';
import { trackEvent } from './lib/analytics';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const resolveApiAssetUrl = (assetUrl) => {
  if (!assetUrl) return '';
  if (/^https?:\/\//i.test(assetUrl) || assetUrl.startsWith('data:') || assetUrl.startsWith('blob:')) {
    return assetUrl;
  }

  try {
    const base = api.defaults.baseURL || window.location.origin;
    return new URL(assetUrl, base).toString();
  } catch (_) {
    return assetUrl;
  }
};

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Track failed API requests (skip the analytics endpoint itself to avoid loops)
    try {
      const url = error.config?.url || '';
      if (!url.includes('/api/analytics/')) {
        trackEvent('api_failure', {
          url,
          method: (error.config?.method || '').toUpperCase(),
          status: error.response?.status || 0,
          code: error.code || null
        });
      }
    } catch { /* never let tracking break error handling */ }

    if (error.response?.status === 401) {
      const token = localStorage.getItem('authToken');
      const currentPath = window.location.pathname;
      // Only redirect if the user HAD a token that became invalid/expired.
      // If there's no token, the user is a guest — let the component handle the 401 silently.
      if (token && currentPath !== '/login' && currentPath !== '/') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
