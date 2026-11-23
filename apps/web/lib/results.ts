import { api } from './api';
import type { ClassResult, StudentReport } from '../types/result';

export const resultsApi = {
  classResults: (classId: string) =>
    api.get<ClassResult>(`/classes/${classId}/results`),
  studentReport: (studentId: string) =>
    api.get<StudentReport>(`/students/${studentId}/report-card`),
};
