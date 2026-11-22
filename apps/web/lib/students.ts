import { api } from './api';
import type {
  CreateStudentInput,
  Student,
  UpdateStudentInput,
} from '../types/student';

export const studentsApi = {
  list: (classId?: string, signal?: AbortSignal) =>
    api.get<Student[]>(
      classId
        ? `/students?classId=${encodeURIComponent(classId)}`
        : '/students',
      signal,
    ),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  create: (input: CreateStudentInput) => api.post<Student>('/students', input),
  update: (id: string, input: UpdateStudentInput) =>
    api.patch<Student>(`/students/${id}`, input),
  remove: (id: string) => api.delete(`/students/${id}`),
};
