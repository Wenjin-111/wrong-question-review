import client from './client';
import type { Subject, QuestionType } from '../types';

export const subjectsApi = {
  list: () => client.get<Subject[]>('/subjects'),
  create: (data: { name: string; color: string }) => client.post<Subject>('/subjects', data),
  update: (id: number, data: { name?: string; color?: string }) =>
    client.put<Subject>(`/subjects/${id}`, data),
  delete: (id: number) => client.delete(`/subjects/${id}`),
  createType: (subjectId: number, data: { name: string }) =>
    client.post<QuestionType>(`/subjects/${subjectId}/types`, data),
  updateType: (id: number, data: { name?: string }) =>
    client.put<QuestionType>(`/types/${id}`, data),
  deleteType: (id: number) => client.delete(`/types/${id}`),
};
