import { api } from './api';
import type {
  AcademicYear,
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
} from '../types/academic-year';

export const academicYearsApi = {
  list: (signal?: AbortSignal) =>
    api.get<AcademicYear[]>('/academic-years', signal),
  get: (id: string) => api.get<AcademicYear>(`/academic-years/${id}`),
  create: (input: CreateAcademicYearInput) =>
    api.post<AcademicYear>('/academic-years', input),
  update: (id: string, input: UpdateAcademicYearInput) =>
    api.patch<AcademicYear>(`/academic-years/${id}`, input),
  remove: (id: string) => api.delete(`/academic-years/${id}`),
  activate: (id: string) =>
    api.patch<AcademicYear>(`/academic-years/${id}/activate`),
};
