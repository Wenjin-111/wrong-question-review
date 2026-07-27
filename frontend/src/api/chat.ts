import client from './client';

export const chatApi = {
  listSessions: () => client.get('/chat/sessions'),
  createSession: (questionId: number) => client.post('/chat/sessions', { question_id: questionId }),
  deleteSession: (id: number) => client.delete(`/chat/sessions/${id}`),
  getMessages: (sessionId: number) => client.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: number, message: string) =>
    client.post(`/chat/sessions/${sessionId}/send`, { message }, { responseType: 'stream' }),
};
