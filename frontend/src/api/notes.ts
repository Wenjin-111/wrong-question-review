import client from './client';

export const notesApi = {
  list: (questionId: number) => client.get(`/questions/${questionId}/notes`),
  create: (questionId: number, content: string) =>
    client.post(`/questions/${questionId}/notes`, { content }),
  update: (noteId: number, content: string) =>
    client.put(`/notes/${noteId}`, { content }),
  delete: (noteId: number) => client.delete(`/notes/${noteId}`),
};
