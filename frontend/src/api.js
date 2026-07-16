export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const resolveUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const assetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

const request = async (path, options = {}) => {
  const token = localStorage.getItem('authToken');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(resolveUrl(path), {
      ...options,
      headers,
      body: options.body ? (isFormData ? options.body : JSON.stringify(options.body)) : undefined,
    });
  } catch {
    throw {
      message: 'Khong ket noi duoc backend. Hay chay Spring Boot o cong 8080 roi thu lai.',
    };
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw {
      ...(data || {}),
      message: data?.message || response.statusText,
      status: response.status,
    };
  }

  return data;
};

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const result = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });

  if (result?.data?.token) {
    localStorage.setItem('authToken', result.data.token);
    return result.data.token;
  }

  return null;
};

const api = async (path, options = {}) => {
  try {
    return await request(path, options);
  } catch (error) {
    if (error?.status !== 401 || path === '/auth/refresh') {
      throw error;
    }

    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return await request(path, options);
      }
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }

    throw error;
  }
};

export default api;
