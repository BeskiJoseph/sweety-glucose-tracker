/**
 * Centralized API client for Sweety Blood Glucose Tracker.
 * Always includes credentials for secure HTTP-only cookie exchange.
 */

const API_BASE = '/api';

/**
 * Perform parameterized fetch request with JSON parsing and standardized error handling.
 *
 * @param {string} endpoint - API path relative to /api
 * @param {RequestInit} [options] - Fetch options
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers,
    credentials: 'include'
  };

  const response = await fetch(url, config);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  getMe: () => request('/auth/me')
};

export const readingsApi = {
  getAll: ({ page = 1, limit = 20 } = {}) =>
    request(`/readings?page=${page}&limit=${limit}`),

  getById: (id) => request(`/readings/${id}`),

  create: (readingData) =>
    request('/readings', {
      method: 'POST',
      body: JSON.stringify(readingData)
    }),

  update: (id, readingData) =>
    request(`/readings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(readingData)
    }),

  delete: (id) =>
    request(`/readings/${id}`, {
      method: 'DELETE'
    })
};

export const reportsApi = {
  getReports: (date) =>
    request(`/reports${date ? `?date=${encodeURIComponent(date)}` : ''}`),

  getTrend: (month) =>
    request(`/reports/trend${month ? `?month=${encodeURIComponent(month)}` : ''}`)
};

export const doctorApi = {
  getPatients: () => request('/doctor/patients'),

  getPatientReports: (patientId, date) =>
    request(
      `/doctor/patients/${patientId}/reports${date ? `?date=${encodeURIComponent(date)}` : ''}`
    )
};
