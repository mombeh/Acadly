import { api } from './api';
import type {
  BulkMarksInput,
  Mark,
  MarkSequence,
  RosterMark,
} from '../types/mark';

export const marksApi = {
  roster: (
    classId: string,
    classSubjectId: string,
    sequence: MarkSequence,
    signal?: AbortSignal,
  ) =>
    api.get<RosterMark[]>(
      `/classes/${classId}/subjects/${classSubjectId}/marks?sequence=${sequence}`,
      signal,
    ),
  saveBulk: (classId: string, classSubjectId: string, input: BulkMarksInput) =>
    api.post<Mark[]>(
      `/classes/${classId}/subjects/${classSubjectId}/marks/bulk`,
      input,
    ),
  get: (id: string) => api.get<Mark>(`/marks/${id}`),
  update: (id: string, score: number) =>
    api.patch<Mark>(`/marks/${id}`, { score }),
  remove: (id: string) => api.delete(`/marks/${id}`),
};
