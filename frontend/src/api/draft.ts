import client from './client';

export interface DraftData {
  subject_id?: number;
  question_type_id?: number;
  content?: string;
  answer?: string;
  explanation?: string;
  source?: string;
  tag_ids?: number[];
  ocr_text?: string;
  ai_parse_result?: Record<string, string>;
  image_file_id?: number;
}

export const draftApi = {
  list: () => client.get('/drafts'),
  get: (id: number) => client.get(`/drafts/${id}`),
  save: (data: DraftData) => client.post('/drafts', data),
  delete: (id: number) => client.delete(`/drafts/${id}`),
  convert: (id: number) => client.post(`/drafts/${id}/convert`),
};
