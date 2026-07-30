import client from './client';

export const statsApi = {
  dashboard: () => client.get('/stats/dashboard'),
  overview: () => client.get('/stats/overview'),
  trends: (days: number = 7) => client.get('/stats/trends', { params: { days } }),
  subjectsBreakdown: () => client.get('/stats/subjects-breakdown'),
  streak: () => client.get('/stats/streak'),
};
