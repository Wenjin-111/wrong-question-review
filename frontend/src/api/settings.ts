import client from './client';

export const settingsApi = {
  getGame24Enabled: () => client.get('/settings/game24-enabled'),
  updateGame24Enabled: (enabled: boolean) => client.put('/settings/game24-enabled', { enabled }),
  getTheme: () => client.get('/settings/theme'),
  updateTheme: (theme: string) => client.put('/settings/theme', { theme }),
  getBackgroundImage: () => client.get('/settings/background-image'),
  updateBackgroundImage: (bg_image: string) => client.put('/settings/background-image', { bg_image }),
  getBgOverlay: () => client.get('/settings/bg-overlay'),
  updateBgOverlay: (overlay: number) => client.put('/settings/bg-overlay', { overlay }),
  getBgHistory: () => client.get('/settings/background-history'),
  deleteBgHistory: (url: string) => client.delete('/settings/background-history', { data: { url } }),
  getSignature: () => client.get('/settings/signature'),
  updateSignature: (signature: string) => client.put('/settings/signature', { signature }),
  getFsrsRetention: () => client.get('/settings/fsrs-retention'),
  updateFsrsRetention: (retention: number) => client.put('/settings/fsrs-retention', { retention }),
  getAiConfig: () => client.get('/settings/ai-config'),
  updateAiConfig: (data: { api_url: string; api_key: string; model: string }) => client.put('/settings/ai-config', data),
  getMineruToken: () => client.get('/settings/mineru-token'),
  updateMineruToken: (token: string) => client.put('/settings/mineru-token', { token }),
  updateUserInfo: (data: { username?: string; email?: string }) => client.put('/settings/user-info', data),
  updatePassword: (data: { old_password: string; new_password: string }) => client.put('/settings/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/settings/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
