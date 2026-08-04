import client from './client';

export interface ImageItem {
  id: number | null;
  type: 'upload' | 'mineru';
  url: string;
  file_size: number;
  original_name: string | null;
  created_at: string;
  in_use: boolean;
}

export const imagesApi = {
  list: () => client.get('/images'),
  remove: (id: number) => client.delete(`/images/${id}`),
  removeMineru: (name: string) => client.delete(`/images/mineru/${encodeURIComponent(name)}`),
};
