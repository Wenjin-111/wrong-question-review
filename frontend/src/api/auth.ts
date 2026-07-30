import client from './client';

export interface LoginParams {
  login: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export const authApi = {
  login: (params: LoginParams) => client.post('/auth/login', params),
  register: (params: RegisterParams) => client.post('/auth/register', params),
  refresh: (refreshToken: string) => client.post('/auth/refresh', { refresh_token: refreshToken }),
  me: () => client.get('/auth/me'),
  logout: () => client.post('/auth/logout'),
};
