import { api } from './api';
import type {
  CreateSubjectInput,
  Subject,
  UpdateSubjectInput,
} from '../types/subject';

export const subjectsApi = {
  list: (signal?: AbortSignal) => api.get<Subject[]>('/subjects', signal),
  get: (id: string) => api.get<Subject>(`/subjects/${id}`),
  create: (input: CreateSubjectInput) => api.post<Subject>('/subjects', input),
  update: (id: string, input: UpdateSubjectInput) =>
    api.patch<Subject>(`/subjects/${id}`, input),
  remove: (id: string) => api.delete(`/subjects/${id}`),
};
