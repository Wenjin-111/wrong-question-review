import client from './client';

export interface CreateSessionParams {
  review_mode: string;
  subject_ids: number[];
  type_ids?: number[];
  tag_ids?: number[];
  min_accuracy?: number;
  limit?: number;
  order?: string;
}

export const reviewApi = {
  createSession: (data: CreateSessionParams) => client.post('/review/sessions', data),
  getSession: (id: number) => client.get(`/review/sessions/${id}`),
  submitAnswer: (sessionId: number, data: { question_id: number; user_answer: string; is_correct?: boolean }) =>
    client.post(`/review/sessions/${sessionId}/submit`, data),
  finishSession: (sessionId: number) => client.put(`/review/sessions/${sessionId}/finish`),
  todayPending: () => client.get('/review/today-pending'),
};
