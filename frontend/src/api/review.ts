import client from './client';

export interface CreateSessionParams {
  review_mode: string;
  subject_ids: number[];
  type_ids?: number[];
  tag_ids?: number[];
  question_ids?: number[];
  min_accuracy?: number;
  limit?: number;
  order?: string;
}

export const reviewApi = {
  listSessions: () => client.get('/review/sessions'),
  createSession: (data: CreateSessionParams) => client.post('/review/sessions', data),
  getSession: (id: number) => client.get(`/review/sessions/${id}`),
  resumeSession: (id: number) => client.get(`/review/sessions/${id}/resume`),
  submitAnswer: (sessionId: number, data: { question_id: number; user_answer: string; is_correct?: boolean; current_index: number; rating?: number }) =>
    client.post(`/review/sessions/${sessionId}/submit`, data),
  finishSession: (sessionId: number) => client.put(`/review/sessions/${sessionId}/finish`),
  todayPending: () => client.get('/review/today-pending'),
};
