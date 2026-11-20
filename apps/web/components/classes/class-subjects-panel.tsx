'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { classSubjectsApi } from '../../lib/class-subjects';
import type { ClassSubject } from '../../types/class-subject';
import type { SchoolClass } from '../../types/class';
import type { Subject } from '../../types/subject';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Feedback } from '../ui/feedback';
import ui from '../ui/dashboard.module.css';
import styles from './class-subjects-panel.module.css';

type Status = 'loading' | 'ready' | 'error';

interface FeedbackState {
  tone: 'success' | 'error';
  message: string;
}

interface ClassSubjectsPanelProps {
  classRecord: SchoolClass;
  subjects: Subject[];
  onClose: () => void;
}

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

function parseCoefficient(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999.99) {
    return null;
  }
  return parsed;
}

function formatCoefficient(value: string | number): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : String(value);
}

export function ClassSubjectsPanel({
  classRecord,
  subjects,
  onClose,
}: ClassSubjectsPanelProps) {
  const [assignments, setAssignments] = useState<ClassSubject[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [subjectId, setSubjectId] = useState('');
  const [coefficient, setCoefficient] = useState('1');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const [removing, setRemoving] = useState<ClassSubject | null>(null);
  const [removeError, setRemoveError] = useState('');
  const [removingBusy, setRemovingBusy] = useState(false);

  useEffect(() => {
    let active = true;

    classSubjectsApi
      .list(classRecord.id)
      .then((data) => {
        if (!active) {
          return;
        }
        setAssignments(data);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setLoadError(messageFor(error));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [classRecord.id]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setLoadError('');

    try {
      const data = await classSubjectsApi.list(classRecord.id);
      setAssignments(data);
      setStatus('ready');
    } catch (error) {
      setLoadError(messageFor(error));
      setStatus('error');
    }
  }, [classRecord.id]);

  async function handleAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subjectId) {
      setAddError('Select a subject to assign.');
      return;
    }

    const parsed = parseCoefficient(coefficient);
    if (parsed === null) {
      setAddError(
        'Coefficient must be a number greater than 0 and at most 999.99.',
      );
      return;
    }

    setAddError('');
    setFeedback(null);
    setAdding(true);

    try {
      const created = await classSubjectsApi.create(classRecord.id, {
        subjectId,
        coefficient: parsed,
      });
      setSubjectId('');
      setCoefficient('1');
      setFeedback({
        tone: 'success',
        message: `Assigned ${created.subject.name} with coefficient ${formatCoefficient(created.coefficient)}.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setAdding(false);
    }
  }

  function startEditing(assignment: ClassSubject) {
    setEditingId(assignment.id);
    setEditValue(formatCoefficient(assignment.coefficient));
    setEditError('');
  }

  async function handleSaveCoefficient(assignment: ClassSubject) {
    const parsed = parseCoefficient(editValue);
    if (parsed === null) {
      setEditError(
        'Coefficient must be a number greater than 0 and at most 999.99.',
      );
      return;
    }

    setEditError('');
    setSavingId(assignment.id);

    try {
      await classSubjectsApi.update(classRecord.id, assignment.id, {
        coefficient: parsed,
      });
      setEditingId(null);
      setFeedback({
        tone: 'success',
        message: `Updated the coefficient for ${assignment.subject.name}.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove() {
    if (!removing) {
      return;
    }

    setRemoveError('');
    setRemovingBusy(true);

    try {
      const subjectName = removing.subject.name;
      await classSubjectsApi.remove(classRecord.id, removing.id);
      setRemoving(null);
      setFeedback({
        tone: 'success',
        message: `Removed ${subjectName} from this class.`,
      });
      await refresh();
    } catch (error) {
      setRemoveError(messageFor(error));
    } finally {
      setRemovingBusy(false);
    }
  }

  const assignedIds = new Set(assignments.map((item) => item.subjectId));
  const availableSubjects = subjects.filter(
    (subject) => !assignedIds.has(subject.id),
  );

  return (
    <section className={`${ui.card} ${styles.panel}`}>
      <div className={ui.cardHeader}>
        <div>
          <h2 className={ui.cardTitle}>
            Subjects for {classRecord.name}
            {classRecord.academicYear
              ? ` (${classRecord.academicYear.name})`
              : ''}
          </h2>
          <p className={ui.cardSubtitle}>
            Assign subjects with coefficients used for averages later.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <form
        className={`${ui.form} ${styles.assignForm}`}
        onSubmit={handleAssign}
        noValidate
      >
        <div className={ui.field}>
          <label className={ui.label} htmlFor="assignment-subject">
            Subject
          </label>
          <select
            id="assignment-subject"
            className={ui.select}
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={
              adding || status !== 'ready' || availableSubjects.length === 0
            }
            required
          >
            <option value="">
              {availableSubjects.length === 0
                ? 'All subjects are assigned'
                : 'Select a subject'}
            </option>
            {availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        <div className={ui.field}>
          <label className={ui.label} htmlFor="assignment-coefficient">
            Coefficient
          </label>
          <input
            id="assignment-coefficient"
            className={ui.input}
            type="number"
            min="0.01"
            max="999.99"
            step="0.01"
            value={coefficient}
            onChange={(event) => setCoefficient(event.target.value)}
            disabled={adding || status !== 'ready'}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={
            adding || status !== 'ready' || availableSubjects.length === 0
          }
        >
          {adding ? 'Assigning...' : 'Assign subject'}
        </Button>
      </form>

      {addError && <p className={ui.formError}>{addError}</p>}

      {status === 'loading' && (
        <div className={ui.stateBlock}>
          <p className={ui.stateTitle}>Loading subjects</p>
          <p className={ui.stateText}>
            Fetching subject assignments for this class.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className={ui.stateBlock} role="alert">
          <p className={ui.stateTitle}>Could not load subject assignments</p>
          <p className={ui.stateText}>{loadError}</p>
          <Button onClick={() => void refresh()}>Try again</Button>
        </div>
      )}

      {status === 'ready' && assignments.length === 0 && (
        <div className={ui.stateBlock}>
          <p className={ui.stateTitle}>No subjects assigned</p>
          <p className={ui.stateText}>
            Assign a subject to this class to start recording marks.
          </p>
        </div>
      )}

      {status === 'ready' && assignments.length > 0 && (
        <div className={ui.tableWrapper}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Code</th>
                <th scope="col">Coefficient</th>
                <th scope="col" className={ui.actionsHeader}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const isEditing = editingId === assignment.id;
                return (
                  <tr key={assignment.id}>
                    <td className={ui.nameCell}>{assignment.subject.name}</td>
                    <td className={ui.mono}>{assignment.subject.code}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className={`${ui.input} ${styles.coefficientInput}`}
                          type="number"
                          min="0.01"
                          max="999.99"
                          step="0.01"
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          disabled={savingId === assignment.id}
                          aria-label={`Coefficient for ${assignment.subject.name}`}
                        />
                      ) : (
                        <span className={`${ui.badge} ${ui.badgeAccent}`}>
                          {formatCoefficient(assignment.coefficient)}
                        </span>
                      )}
                      {isEditing && editError && (
                        <p className={styles.rowError}>{editError}</p>
                      )}
                    </td>
                    <td>
                      <div className={ui.rowActions}>
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                void handleSaveCoefficient(assignment)
                              }
                              disabled={savingId === assignment.id}
                            >
                              {savingId === assignment.id
                                ? 'Saving...'
                                : 'Save'}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingId(null)}
                              disabled={savingId === assignment.id}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEditing(assignment)}
                          >
                            Edit coefficient
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRemoveError('');
                            setRemoving(assignment);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {removing && (
        <ConfirmDialog
          title="Remove subject"
          message={`Remove ${removing.subject.name} from ${classRecord.name}? Assignments with recorded marks cannot be removed.`}
          confirmLabel="Remove"
          busy={removingBusy}
          error={removeError}
          onCancel={() => setRemoving(null)}
          onConfirm={() => void handleRemove()}
        />
      )}
    </section>
  );
}
