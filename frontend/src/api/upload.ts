import client from './client';

export const uploadApi = {
  image: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
