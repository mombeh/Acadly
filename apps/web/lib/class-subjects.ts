import { api } from './api';
import type {
  ClassSubject,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
} from '../types/class-subject';

export const classSubjectsApi = {
  list: (classId: string, signal?: AbortSignal) =>
    api.get<ClassSubject[]>(`/classes/${classId}/subjects`, signal),
  create: (classId: string, input: CreateClassSubjectInput) =>
    api.post<ClassSubject>(`/classes/${classId}/subjects`, input),
  update: (
    classId: string,
    classSubjectId: string,
    input: UpdateClassSubjectInput,
  ) =>
    api.patch<ClassSubject>(
      `/classes/${classId}/subjects/${classSubjectId}`,
      input,
    ),
  remove: (classId: string, classSubjectId: string) =>
    api.delete(`/classes/${classId}/subjects/${classSubjectId}`),
};
