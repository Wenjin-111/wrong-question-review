import client from './client';

export const chatApi = {
  listSessions: () => client.get('/chat/sessions'),
  createSession: (questionId?: number) => client.post('/chat/sessions', questionId != null ? { question_id: questionId } : {}),
  deleteSession: (id: number) => client.delete(`/chat/sessions/${id}`),
  getMessages: (sessionId: number) => client.get(`/chat/sessions/${sessionId}/messages`),
  bindQuestion: (sessionId: number, questionId: number | null) =>
    client.put(`/chat/sessions/${sessionId}/bind`, { question_id: questionId }),
  sendMessage: (sessionId: number, message: string) =>
    client.post(`/chat/sessions/${sessionId}/send`, { message }, { responseType: 'stream' }),
};
