import client from './client';

export const aiChatApi = {
  history: (questionId: number) => client.get(`/questions/${questionId}/chat/history`),
  send: (questionId: number, message: string) =>
    client.post(`/questions/${questionId}/chat/send`, { message }, { responseType: 'stream' }),
};
