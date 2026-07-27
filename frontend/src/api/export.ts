import client from './client';

export const exportApi = {
  exportData: (format: string = 'json', questionIds?: number[], subjectIds?: number[], mode?: string) =>
    client.post('/export/data', { format, question_ids: questionIds, subject_ids: subjectIds, mode }, { responseType: 'blob' }),
};
