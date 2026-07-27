import client from './client';

export const ocrApi = {
  recognize: (data: { image_file_id: number; crop?: { x: number; y: number; width: number; height: number }; rotation?: number }) =>
    client.post('/ocr/recognize', data),
  parse: (data: { ocr_text: string }) => client.post('/ocr/parse', data),
  extractPdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/pdf/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
};
