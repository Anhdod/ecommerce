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

const api = async (path, options = {}) => {
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
    throw data || { message: response.statusText, status: response.status };
  }

  return data;
};

export default api;
