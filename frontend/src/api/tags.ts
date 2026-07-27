import client from './client';
import type { Tag } from '../types';

export const tagsApi = {
  list: () => client.get<Tag[]>('/tags'),
  create: (data: { name: string; color: string }) => client.post<Tag>('/tags', data),
  update: (id: number, data: { name?: string; color?: string }) =>
    client.put<Tag>(`/tags/${id}`, data),
  delete: (id: number) => client.delete(`/tags/${id}`),
};
