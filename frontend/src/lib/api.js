import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  withCredentials: true,
});

/**
 * The backend returns a stable `code` for every error. The active i18n
 * translator is registered here so every toast shows the message in the
 * user's selected language, with the server's English text as a fallback.
 */
let translateErrorCode = null;

export function setErrorTranslator(fn) {
  translateErrorCode = fn;
}

export function toApiError(error) {
  const code = error.response?.data?.code || (error.response ? 'ERROR' : 'NETWORK_ERROR');
  const key = `errors.${code}`;
  const translated = translateErrorCode?.(key);
  const message =
    translated && translated !== key
      ? translated
      : error.response?.data?.error || error.message || 'Request failed';
  const apiError = new Error(message);
  apiError.code = code;
  apiError.status = error.response?.status ?? null;
  apiError.details = error.response?.data?.details;
  return apiError;
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/me')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(toApiError(error));
  }
);
