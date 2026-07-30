import { API_BASE_URL } from '../config';

export interface SSEHandlers {
  onToken: (fullText: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: string) => void;
}

export async function streamSSE(
  url: string,
  body: object,
  handlers: SSEHandlers,
): Promise<void> {
  const token = localStorage.getItem('access_token') || '';

  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    handlers.onError(`请求失败 (${response.status})`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError('无法读取响应流');
    return;
  }

  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        for (const line of part.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6);
          if (chunk === '[DONE]') {
            handlers.onDone(full);
            return;
          }
          if (chunk.startsWith('[ERROR]')) {
            handlers.onError(chunk.slice(7));
            return;
          }
          full += chunk;
          handlers.onToken(full);
        }
      }
    }
  } catch {
    handlers.onError('网络请求失败');
  }
}
