'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { subjectsApi } from '../../lib/subjects';
import type { Subject } from '../../types/subject';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Feedback } from '../ui/feedback';
import { Modal } from '../ui/modal';
import ui from '../ui/dashboard.module.css';
import styles from './subjects-manager.module.css';

type Status = 'loading' | 'ready' | 'error';

interface FeedbackState {
  tone: 'success' | 'error';
  message: string;
}

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

function assignmentSummary(subject: Subject): string {
  const count = subject.classSubjects?.length ?? 0;
  if (count === 0) {
    return 'Not assigned';
  }
  return count === 1 ? '1 class' : `${count} classes`;
}

export function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    let active = true;

    subjectsApi
      .list()
      .then((data) => {
        if (!active) {
          return;
        }
        setSubjects(data);
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
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setLoadError('');

    try {
      const data = await subjectsApi.list();
      setSubjects(data);
      setStatus('ready');
    } catch (error) {
      setLoadError(messageFor(error));
      setStatus('error');
    }
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

    if (!trimmedName) {
      setFormError('Subject name is required.');
      return;
    }
    if (!trimmedCode) {
      setFormError('Subject code is required.');
      return;
    }

    setFormError('');
    setFeedback(null);
    setSubmitting(true);

    try {
      const created = await subjectsApi.create({
        name: trimmedName,
        code: trimmedCode,
      });
      setName('');
      setCode('');
      setFeedback({
        tone: 'success',
        message: `Created ${created.name} (${created.code}).`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setEditName(subject.name);
    setEditCode(subject.code);
    setEditError('');
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    const trimmedName = editName.trim();
    const trimmedCode = editCode.trim();

    if (!trimmedName) {
      setEditError('Subject name is required.');
      return;
    }
    if (!trimmedCode) {
      setEditError('Subject code is required.');
      return;
    }

    setEditError('');
    setSavingEdit(true);

    try {
      const updated = await subjectsApi.update(editing.id, {
        name: trimmedName,
        code: trimmedCode,
      });
      setEditing(null);
      setFeedback({
        tone: 'success',
        message: `Updated ${updated.name} (${updated.code}).`,
      });
      await refresh();
    } catch (error) {
      setEditError(messageFor(error));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleting) {
      return;
    }

    setDeleteError('');
    setDeletingBusy(true);

    try {
      const subjectName = deleting.name;
      await subjectsApi.remove(deleting.id);
      setDeleting(null);
      setFeedback({
        tone: 'success',
        message: `Deleted ${subjectName}.`,
      });
      await refresh();
    } catch (error) {
      setDeleteError(messageFor(error));
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className={ui.stack}>
      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Create a subject</h2>
            <p className={ui.cardSubtitle}>
              Subjects are shared across classes and referenced by unique codes.
            </p>
          </div>
        </div>

        <form
          className={`${ui.form} ${styles.subjectForm}`}
          onSubmit={handleCreate}
          noValidate
        >
          <div className={ui.field}>
            <label className={ui.label} htmlFor="subject-name">
              Subject name
            </label>
            <input
              id="subject-name"
              className={ui.input}
              type="text"
              placeholder="Mathematics"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting || status !== 'ready'}
              required
            />
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor="subject-code">
              Subject code
            </label>
            <input
              id="subject-code"
              className={ui.input}
              type="text"
              placeholder="MATH"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={submitting || status !== 'ready'}
              required
            />
          </div>

          <Button type="submit" disabled={submitting || status !== 'ready'}>
            {submitting ? 'Creating...' : 'Create subject'}
          </Button>
        </form>

        {formError && <p className={ui.formError}>{formError}</p>}
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Subjects</h2>
            <p className={ui.cardSubtitle}>
              {status === 'ready'
                ? `${subjects.length} ${
                    subjects.length === 1 ? 'subject' : 'subjects'
                  } in the catalogue`
                : 'Loading subjects'}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => void refresh()}
            disabled={status === 'loading'}
          >
            Refresh
          </Button>
        </div>

        {status === 'loading' && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Loading subjects</p>
            <p className={ui.stateText}>
              Fetching the subject catalogue from the Acadly API.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className={ui.stateBlock} role="alert">
            <p className={ui.stateTitle}>Could not load subjects</p>
            <p className={ui.stateText}>{loadError}</p>
            <Button onClick={() => void refresh()}>Try again</Button>
          </div>
        )}

        {status === 'ready' && subjects.length === 0 && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>No subjects yet</p>
            <p className={ui.stateText}>
              Create a subject using the form above to assign it to classes.
            </p>
          </div>
        )}

        {status === 'ready' && subjects.length > 0 && (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Code</th>
                  <th scope="col">Assignments</th>
                  <th scope="col" className={ui.actionsHeader}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td className={ui.nameCell}>{subject.name}</td>
                    <td className={ui.mono}>{subject.code}</td>
                    <td>
                      <span className={ui.badge}>
                        {assignmentSummary(subject)}
                      </span>
                    </td>
                    <td>
                      <div className={ui.rowActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(subject)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeleteError('');
                            setDeleting(subject);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <Modal title="Edit subject" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} noValidate>
            <div className={styles.editGrid}>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-subject-name">
                  Subject name
                </label>
                <input
                  id="edit-subject-name"
                  className={ui.input}
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={savingEdit}
                  required
                />
              </div>

              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-subject-code">
                  Subject code
                </label>
                <input
                  id="edit-subject-code"
                  className={ui.input}
                  type="text"
                  value={editCode}
                  onChange={(event) => setEditCode(event.target.value)}
                  disabled={savingEdit}
                  required
                />
              </div>
            </div>

            {editError && (
              <p className={ui.formError} role="alert">
                {editError}
              </p>
            )}

            <div className={ui.formFooter}>
              <Button
                variant="secondary"
                onClick={() => setEditing(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete subject"
          message={`Delete ${deleting.name} (${deleting.code})? Subjects assigned to a class cannot be deleted.`}
          busy={deletingBusy}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}
