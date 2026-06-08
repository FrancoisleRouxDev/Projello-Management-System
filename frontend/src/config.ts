// src/config.ts
const getApiBaseUrl = (): string => {
  // Priority 1: Explicitly set via environment variable (from webpack DefinePlugin)
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }

  // Priority 2: Production build
  if (process.env.NODE_ENV === 'production') {
    return 'https://projello-management-system.onrender.com';
  }

  // Default: Local development
  return 'http://localhost:5049';
};

export const API_BASE_URL = getApiBaseUrl();

// Only log in development
if (process.env.NODE_ENV !== 'production') {
  console.log('API_BASE_URL loaded:', API_BASE_URL);
}