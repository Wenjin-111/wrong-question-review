import client from './client';

export interface QuestionListParams {
  subject_id?: string;
  type_id?: string;
  tag_id?: string;
  keyword?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface QuestionData {
  subject_id: number;
  question_type_id: number;
  content: string;
  answer: string;
  explanation?: string;
  source?: string;
  tag_ids?: number[];
}

export const questionsApi = {
  list: (params: QuestionListParams) => client.get('/questions', { params }),
  get: (id: number) => client.get(`/questions/${id}`),
  create: (data: QuestionData) => client.post('/questions', data),
  update: (id: number, data: Partial<QuestionData>) => client.put(`/questions/${id}`, data),
  delete: (id: number) => client.delete(`/questions/${id}`),
  batchDelete: (ids: number[]) => client.post('/questions/batch-delete', { ids }),
  batchTag: (ids: number[], tag_ids: number[]) => client.put('/questions/batch-tag', { ids, tag_ids }),
};
