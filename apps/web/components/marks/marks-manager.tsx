'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { academicYearsApi } from '../../lib/academic-years';
import { classesApi } from '../../lib/classes';
import { classSubjectsApi } from '../../lib/class-subjects';
import { marksApi } from '../../lib/marks';
import type { AcademicYear } from '../../types/academic-year';
import type { ClassSubject } from '../../types/class-subject';
import type { SchoolClass } from '../../types/class';
import type { BulkMarkEntry, MarkSequence, RosterMark } from '../../types/mark';
import { Button } from '../ui/button';
import { Feedback } from '../ui/feedback';
import ui from '../ui/dashboard.module.css';
import styles from './marks-manager.module.css';

type LoadStatus = 'loading' | 'ready' | 'error';
type SelectionStatus = 'idle' | LoadStatus;

interface FeedbackState {
  tone: 'success' | 'error';
  message: string;
}

const sequences: Array<{ value: MarkSequence; label: string }> = [
  { value: 'SEQUENCE_1', label: 'Sequence 1' },
  { value: 'SEQUENCE_2', label: 'Sequence 2' },
  { value: 'SEQUENCE_3', label: 'Sequence 3' },
];

const sequenceLabels: Record<MarkSequence, string> = {
  SEQUENCE_1: 'Sequence 1',
  SEQUENCE_2: 'Sequence 2',
  SEQUENCE_3: 'Sequence 3',
};

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

function scoresFromRoster(roster: RosterMark[]): Record<string, string> {
  const scores: Record<string, string> = {};

  for (const row of roster) {
    scores[row.studentId] = row.score === null ? '' : String(Number(row.score));
  }

  return scores;
}

export function MarksManager() {
  const [metaStatus, setMetaStatus] = useState<LoadStatus>('loading');
  const [metaError, setMetaError] = useState('');
  const [metaToken, setMetaToken] = useState(0);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [sequence, setSequence] = useState<MarkSequence>('SEQUENCE_1');

  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [assignmentStatus, setAssignmentStatus] =
    useState<SelectionStatus>('idle');
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentToken, setAssignmentToken] = useState(0);

  const [roster, setRoster] = useState<RosterMark[]>([]);
  const [rosterStatus, setRosterStatus] = useState<SelectionStatus>('idle');
  const [rosterError, setRosterError] = useState('');
  const [rosterToken, setRosterToken] = useState(0);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([academicYearsApi.list(), classesApi.list()])
      .then(([yearList, classList]) => {
        if (!active) {
          return;
        }
        setYears(yearList);
        setClasses(classList);
        const preferred = yearList.find((year) => year.isActive) ?? yearList[0];
        setYearId((current) => current || preferred?.id || '');
        setMetaStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setMetaError(messageFor(error));
        setMetaStatus('error');
      });

    return () => {
      active = false;
    };
  }, [metaToken]);

  useEffect(() => {
    if (!classId) {
      return;
    }

    let active = true;

    classSubjectsApi
      .list(classId)
      .then((data) => {
        if (!active) {
          return;
        }
        setAssignments(data);
        setAssignmentStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setAssignmentError(messageFor(error));
        setAssignmentStatus('error');
      });

    return () => {
      active = false;
    };
  }, [classId, assignmentToken]);

  useEffect(() => {
    if (!classId || !classSubjectId) {
      return;
    }

    let active = true;

    marksApi
      .roster(classId, classSubjectId, sequence)
      .then((data) => {
        if (!active) {
          return;
        }
        setRoster(data);
        setScores(scoresFromRoster(data));
        setScoreErrors({});
        setRosterStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setRosterError(messageFor(error));
        setRosterStatus('error');
      });

    return () => {
      active = false;
    };
  }, [classId, classSubjectId, sequence, rosterToken]);

  function resetRoster() {
    setRoster([]);
    setScores({});
    setScoreErrors({});
    setRosterError('');
    setRosterStatus('idle');
  }

  function handleYearChange(nextYearId: string) {
    setYearId(nextYearId);
    setClassId('');
    setClassSubjectId('');
    setAssignments([]);
    setAssignmentStatus('idle');
    setAssignmentError('');
    setFeedback(null);
    resetRoster();
  }

  function handleClassChange(nextClassId: string) {
    setClassId(nextClassId);
    setClassSubjectId('');
    setAssignments([]);
    setAssignmentError('');
    setAssignmentStatus(nextClassId ? 'loading' : 'idle');
    setFeedback(null);
    resetRoster();
  }

  function handleSubjectChange(nextClassSubjectId: string) {
    setClassSubjectId(nextClassSubjectId);
    setFeedback(null);
    resetRoster();

    if (nextClassSubjectId) {
      setRosterStatus('loading');
    }
  }

  function handleSequenceChange(nextSequence: MarkSequence) {
    setSequence(nextSequence);
    setFeedback(null);
    resetRoster();

    if (classSubjectId) {
      setRosterStatus('loading');
    }
  }

  function retryRoster() {
    setRosterStatus('loading');
    setRosterError('');
    setRosterToken((current) => current + 1);
  }

  function retryAssignments() {
    setAssignmentStatus('loading');
    setAssignmentError('');
    setAssignmentToken((current) => current + 1);
  }

  function retryMeta() {
    setMetaStatus('loading');
    setMetaError('');
    setMetaToken((current) => current + 1);
  }

  async function handleSave() {
    if (!classId || !classSubjectId) {
      return;
    }

    const errors: Record<string, string> = {};
    const entries: BulkMarkEntry[] = [];

    for (const row of roster) {
      const raw = (scores[row.studentId] ?? '').trim();

      if (raw === '') {
        continue;
      }

      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 20) {
        errors[row.studentId] = 'Enter a score between 0 and 20.';
        continue;
      }

      entries.push({ studentId: row.studentId, score: value });
    }

    setScoreErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFeedback({
        tone: 'error',
        message: 'Some scores are invalid. Fix the highlighted fields.',
      });
      return;
    }

    if (entries.length === 0) {
      setFeedback({
        tone: 'error',
        message:
          'Enter at least one mark before saving. Empty fields are left unrecorded.',
      });
      return;
    }

    const uniqueEntries = [
      ...new Map(entries.map((entry) => [entry.studentId, entry])).values(),
    ];

    setFeedback(null);
    setSaving(true);

    try {
      await marksApi.saveBulk(classId, classSubjectId, {
        sequence,
        marks: uniqueEntries,
      });
      setFeedback({
        tone: 'success',
        message: `Saved ${uniqueEntries.length} ${
          uniqueEntries.length === 1 ? 'mark' : 'marks'
        } for ${subjectLabel} · ${sequenceLabels[sequence]}.`,
      });
      setRosterStatus('loading');
      setRosterError('');
      setRosterToken((current) => current + 1);
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSaving(false);
    }
  }

  const filteredClasses = classes.filter(
    (classRecord) => classRecord.academicYearId === yearId,
  );
  const selectedYear = years.find((year) => year.id === yearId);
  const selectedClass = classes.find(
    (classRecord) => classRecord.id === classId,
  );
  const selectedAssignment = assignments.find(
    (assignment) => assignment.id === classSubjectId,
  );
  const selectionsComplete = Boolean(yearId && classId && classSubjectId);
  const subjectLabel = selectedAssignment?.subject.name ?? 'the subject';
  const rosterReady = rosterStatus === 'ready';

  return (
    <div className={ui.stack}>
      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Marks entry</h2>
            <p className={ui.cardSubtitle}>
              Choose an academic year, class, subject and sequence, then enter
              scores out of 20. Empty fields are not recorded.
            </p>
          </div>
        </div>

        <div className={`${ui.form} ${styles.selectors}`}>
          <div className={ui.field}>
            <label className={ui.label} htmlFor="marks-year">
              Academic year
            </label>
            <select
              id="marks-year"
              className={ui.select}
              value={yearId}
              onChange={(event) => handleYearChange(event.target.value)}
              disabled={metaStatus !== 'ready'}
            >
              <option value="">Select an academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isActive ? ' (active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="marks-class">
              Class
            </label>
            <select
              id="marks-class"
              className={ui.select}
              value={classId}
              onChange={(event) => handleClassChange(event.target.value)}
              disabled={!yearId || metaStatus !== 'ready'}
            >
              <option value="">
                {yearId ? 'Select a class' : 'Select an academic year first'}
              </option>
              {filteredClasses.map((classRecord) => (
                <option key={classRecord.id} value={classRecord.id}>
                  {classRecord.name}
                </option>
              ))}
            </select>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="marks-subject">
              Subject
            </label>
            <select
              id="marks-subject"
              className={ui.select}
              value={classSubjectId}
              onChange={(event) => handleSubjectChange(event.target.value)}
              disabled={!classId || assignmentStatus !== 'ready'}
            >
              <option value="">
                {!classId
                  ? 'Select a class first'
                  : assignmentStatus === 'loading'
                    ? 'Loading subjects...'
                    : assignments.length === 0
                      ? 'No subjects assigned'
                      : 'Select a subject'}
              </option>
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.subject.name} ({assignment.subject.code})
                </option>
              ))}
            </select>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="marks-sequence">
              Sequence
            </label>
            <select
              id="marks-sequence"
              className={ui.select}
              value={sequence}
              onChange={(event) =>
                handleSequenceChange(event.target.value as MarkSequence)
              }
            >
              {sequences.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {metaStatus === 'error' && (
          <div
            className={`${ui.stateBlock} ${styles.inlineState}`}
            role="alert"
          >
            <p className={ui.stateTitle}>Could not load academic data</p>
            <p className={ui.stateText}>{metaError}</p>
            <Button onClick={retryMeta}>Try again</Button>
          </div>
        )}

        {metaStatus === 'ready' && years.length === 0 && (
          <div className={`${ui.notice} ${styles.inlineNotice}`}>
            <span>Create an academic year before entering marks.</span>
            <Link href="/academic-years" className={ui.noticeLink}>
              Go to Academic Years
            </Link>
          </div>
        )}

        {metaStatus === 'ready' &&
          years.length > 0 &&
          yearId &&
          filteredClasses.length === 0 && (
            <div className={`${ui.notice} ${styles.inlineNotice}`}>
              <span>This academic year has no classes yet.</span>
              <Link href="/classes" className={ui.noticeLink}>
                Go to Classes
              </Link>
            </div>
          )}

        {classId && assignmentStatus === 'error' && (
          <div
            className={`${ui.stateBlock} ${styles.inlineState}`}
            role="alert"
          >
            <p className={ui.stateTitle}>Could not load class subjects</p>
            <p className={ui.stateText}>{assignmentError}</p>
            <Button onClick={retryAssignments}>Try again</Button>
          </div>
        )}

        {classId &&
          assignmentStatus === 'ready' &&
          assignments.length === 0 && (
            <div className={`${ui.notice} ${styles.inlineNotice}`}>
              <span>No subjects are assigned to this class yet.</span>
              <Link href="/classes" className={ui.noticeLink}>
                Assign subjects in Classes
              </Link>
            </div>
          )}
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>
              {selectionsComplete && selectedClass && selectedAssignment
                ? `${selectedClass.name} · ${selectedAssignment.subject.name} · ${sequenceLabels[sequence]}`
                : 'Student marks'}
            </h2>
            <p className={ui.cardSubtitle}>
              {rosterReady
                ? `${roster.length} ${
                    roster.length === 1 ? 'student' : 'students'
                  }${selectedYear ? ` · ${selectedYear.name}` : ''}`
                : 'Scores are recorded out of 20'}
            </p>
          </div>

          {selectionsComplete && rosterReady && roster.length > 0 && (
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Marks'}
            </Button>
          )}
        </div>

        {!selectionsComplete && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Select the marks context</p>
            <p className={ui.stateText}>
              Choose an academic year, class and subject to load the student
              roster and existing marks.
            </p>
          </div>
        )}

        {selectionsComplete && rosterStatus === 'loading' && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Loading marks</p>
            <p className={ui.stateText}>
              Fetching the student roster and existing scores.
            </p>
          </div>
        )}

        {selectionsComplete && rosterStatus === 'error' && (
          <div className={ui.stateBlock} role="alert">
            <p className={ui.stateTitle}>Could not load marks</p>
            <p className={ui.stateText}>{rosterError}</p>
            <Button onClick={retryRoster}>Try again</Button>
          </div>
        )}

        {selectionsComplete && rosterReady && roster.length === 0 && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>No students in this class</p>
            <p className={ui.stateText}>
              Register students for this class before entering marks.
            </p>
            <Link href="/students" className={ui.noticeLink}>
              Go to Students
            </Link>
          </div>
        )}

        {selectionsComplete && rosterReady && roster.length > 0 && (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Student number</th>
                  <th scope="col">Student name</th>
                  <th scope="col">Mark / 20</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((row) => {
                  const value = scores[row.studentId] ?? '';
                  const error = scoreErrors[row.studentId];

                  return (
                    <tr key={row.studentId}>
                      <td className={ui.mono}>{row.studentNumber}</td>
                      <td className={ui.nameCell}>
                        {row.firstName} {row.lastName}
                      </td>
                      <td>
                        <div className={styles.scoreCell}>
                          <input
                            className={`${ui.input} ${styles.scoreInput}`}
                            type="number"
                            min="0"
                            max="20"
                            step="0.01"
                            inputMode="decimal"
                            value={value}
                            placeholder="Not entered"
                            aria-label={`Score for ${row.firstName} ${row.lastName}`}
                            aria-invalid={Boolean(error)}
                            onChange={(event) =>
                              setScores((current) => ({
                                ...current,
                                [row.studentId]: event.target.value,
                              }))
                            }
                            disabled={saving}
                          />
                          {row.markId && (
                            <span className={`${ui.badge} ${ui.badgeAccent}`}>
                              Saved
                            </span>
                          )}
                        </div>
                        {error && (
                          <p className={styles.scoreError} role="alert">
                            {error}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
