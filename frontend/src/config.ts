// src/config.ts
const apiBaseUrl =
  process.env.API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://projello-management-system.onrender.com'
    : 'http://localhost:5049');

export const API_BASE_URL = apiBaseUrl;

console.log('API_BASE_URL loaded:', API_BASE_URL);