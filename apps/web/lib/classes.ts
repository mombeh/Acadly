import { api } from './api';
import type {
  CreateClassInput,
  SchoolClass,
  UpdateClassInput,
} from '../types/class';

export const classesApi = {
  list: (signal?: AbortSignal) => api.get<SchoolClass[]>('/classes', signal),
  get: (id: string) => api.get<SchoolClass>(`/classes/${id}`),
  create: (input: CreateClassInput) => api.post<SchoolClass>('/classes', input),
  update: (id: string, input: UpdateClassInput) =>
    api.patch<SchoolClass>(`/classes/${id}`, input),
  remove: (id: string) => api.delete(`/classes/${id}`),
};
