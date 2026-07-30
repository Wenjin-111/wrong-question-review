import client from './client';

export const ocrApi = {
  recognize: (data: { image_file_id: number; crop?: { x: number; y: number; width: number; height: number }; rotation?: number; engine?: string }) =>
    client.post('/ocr/recognize', data, { timeout: 120000 }),
  parse: (data: { ocr_text: string }) => client.post('/ocr/parse', data),
  parseBatch: (data: { ocr_text: string }) => client.post('/ocr/parse-batch', data, { timeout: 120000 }),
  extractPdf: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/pdf/extract', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
  pdfOcr: (file: File, engine: string = 'hunyuan') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('engine', engine);
    return client.post('/pdf/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,  // 5 min timeout for multi-page OCR
    });
  },
};
