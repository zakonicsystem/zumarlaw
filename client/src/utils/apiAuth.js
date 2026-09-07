import axios from 'axios';
const apiOrigin = new URL(import.meta.env.VITE_API_URL || window.location.origin, window.location.origin).origin;
const isPortalApi = url => { try { const parsed = new URL(url, window.location.origin); return parsed.origin === apiOrigin && parsed.pathname.startsWith('/api/'); } catch { return false; } };
const tokenForPage = () => window.location.pathname.startsWith('/admin')
  ? localStorage.getItem('adminToken') || localStorage.getItem('employeeToken')
  : localStorage.getItem('token');
axios.interceptors.request.use(config => {
  if (isPortalApi(config.url)) {
    const token = tokenForPage();
    if (token && !config.headers.Authorization) config.headers.Authorization = 'Bearer ' + token;
    config.withCredentials = true;
  }
  return config;
});
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  if (isPortalApi(typeof input === 'string' ? input : input.url)) {
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    const token = tokenForPage();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);
    return originalFetch(input, { ...init, headers, credentials: 'include' });
  }
  return originalFetch(input, init);
};
