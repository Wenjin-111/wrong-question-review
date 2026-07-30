import axios from 'axios';
import { API_BASE_URL } from '../config';

const timestamps: number[] = [];
const MAX_PER_MINUTE = 10;
const WINDOW_MS = 60000;

function canReport(): boolean {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  while (timestamps.length > 0 && timestamps[0] < cutoff) timestamps.shift();
  if (timestamps.length >= MAX_PER_MINUTE) return false;
  timestamps.push(now);
  return true;
}

function report(data: Record<string, unknown>) {
  if (!canReport()) return;
  axios.post(`${API_BASE_URL}/log/frontend`, data).catch(() => {});
}

window.onerror = (message, source, lineno, colno, error) => {
  report({
    message: String(message),
    source,
    lineno,
    colno,
    stack: error?.stack?.slice(0, 500),
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
};

window.onunhandledrejection = (event) => {
  report({
    message: `Unhandled Promise: ${String(event.reason)}`,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
};
