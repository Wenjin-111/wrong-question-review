import client from './client';

export const settingsApi = {
  getFsrsRetention: () => client.get('/settings/fsrs-retention'),
  updateFsrsRetention: (retention: number) => client.put('/settings/fsrs-retention', { retention }),
  getAiConfig: () => client.get('/settings/ai-config'),
  updateAiConfig: (data: { api_url: string; api_key: string; model: string }) => client.put('/settings/ai-config', data),
  updateUserInfo: (data: { username?: string; email?: string }) => client.put('/settings/user-info', data),
  updatePassword: (data: { old_password: string; new_password: string }) => client.put('/settings/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/settings/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
