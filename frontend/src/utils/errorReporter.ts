import axios from 'axios';

window.onerror = (message, source, lineno, colno, error) => {
  axios.post('http://localhost:8000/api/log/frontend', {
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack?.slice(0, 500),
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
};

window.onunhandledrejection = (event) => {
  axios.post('http://localhost:8000/api/log/frontend', {
    message: `Unhandled Promise: ${String(event.reason)}`,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
};
