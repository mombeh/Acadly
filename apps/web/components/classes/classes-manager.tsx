'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { academicYearsApi } from '../../lib/academic-years';
import { classesApi } from '../../lib/classes';
import { subjectsApi } from '../../lib/subjects';
import type { AcademicYear } from '../../types/academic-year';
import type { SchoolClass } from '../../types/class';
import type { Subject } from '../../types/subject';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Feedback } from '../ui/feedback';
import { Modal } from '../ui/modal';
import ui from '../ui/dashboard.module.css';
import styles from './classes-manager.module.css';
import { ClassSubjectsPanel } from './class-subjects-panel';

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

export function ClassesManager() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selected, setSelected] = useState<SchoolClass | null>(null);

  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  const load = useCallback(async () => {
    const [classList, yearList, subjectList] = await Promise.all([
      classesApi.list(),
      academicYearsApi.list(),
      subjectsApi.list(),
    ]);

    setClasses(classList);
    setYears(yearList);
    setSubjects(subjectList);
    setAcademicYearId((current) => {
      if (current && yearList.some((year) => year.id === current)) {
        return current;
      }
      const preferred = yearList.find((year) => year.isActive) ?? yearList[0];
      return preferred?.id ?? '';
    });
    setStatus('ready');
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      classesApi.list(),
      academicYearsApi.list(),
      subjectsApi.list(),
    ])
      .then(([classList, yearList, subjectList]) => {
        if (!active) {
          return;
        }
        setClasses(classList);
        setYears(yearList);
        setSubjects(subjectList);
        const preferred = yearList.find((year) => year.isActive) ?? yearList[0];
        setAcademicYearId(preferred?.id ?? '');
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
      await load();
    } catch (error) {
      setLoadError(messageFor(error));
      setStatus('error');
    }
  }, [load]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Class name is required.');
      return;
    }
    if (!academicYearId) {
      setFormError('Select an academic year for the class.');
      return;
    }

    setFormError('');
    setFeedback(null);
    setSubmitting(true);

    try {
      const created = await classesApi.create({
        name: trimmedName,
        academicYearId,
      });
      setName('');
      setFeedback({
        tone: 'success',
        message: `Created the ${created.name} class.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(classRecord: SchoolClass) {
    setEditing(classRecord);
    setEditName(classRecord.name);
    setEditError('');
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Class name is required.');
      return;
    }

    setEditError('');
    setSavingEdit(true);

    try {
      const updated = await classesApi.update(editing.id, {
        name: trimmedName,
      });
      setEditing(null);
      setFeedback({
        tone: 'success',
        message: `Renamed the class to ${updated.name}.`,
      });
      await refresh();
      setSelected((current) =>
        current && current.id === updated.id ? updated : current,
      );
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
      const deletedName = deleting.name;
      await classesApi.remove(deleting.id);
      setDeleting(null);
      setFeedback({
        tone: 'success',
        message: `Deleted the ${deletedName} class.`,
      });
      if (selected?.id === deleting.id) {
        setSelected(null);
      }
      await refresh();
    } catch (error) {
      setDeleteError(messageFor(error));
    } finally {
      setDeletingBusy(false);
    }
  }

  const noYears = status === 'ready' && years.length === 0;

  return (
    <div className={ui.stack}>
      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Create a class</h2>
            <p className={ui.cardSubtitle}>
              Classes belong to an academic year and group students together.
            </p>
          </div>
        </div>

        {noYears ? (
          <div className={ui.notice}>
            <span>Create an academic year before adding classes.</span>
            <Link href="/academic-years" className={ui.noticeLink}>
              Go to Academic Years
            </Link>
          </div>
        ) : (
          <form
            className={`${ui.form} ${styles.classForm}`}
            onSubmit={handleCreate}
            noValidate
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="class-name">
                Class name
              </label>
              <input
                id="class-name"
                className={ui.input}
                type="text"
                placeholder="Form 1 A"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={submitting || status !== 'ready'}
                required
              />
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="class-year">
                Academic year
              </label>
              <select
                id="class-year"
                className={ui.select}
                value={academicYearId}
                onChange={(event) => setAcademicYearId(event.target.value)}
                disabled={submitting || status !== 'ready'}
                required
              >
                <option value="">Select an academic year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={submitting || status !== 'ready'}>
              {submitting ? 'Creating...' : 'Create class'}
            </Button>
          </form>
        )}

        {formError && <p className={ui.formError}>{formError}</p>}
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Classes</h2>
            <p className={ui.cardSubtitle}>
              {status === 'ready'
                ? `${classes.length} ${
                    classes.length === 1 ? 'class' : 'classes'
                  } configured`
                : 'Loading classes'}
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
            <p className={ui.stateTitle}>Loading classes</p>
            <p className={ui.stateText}>
              Fetching classes from the Acadly API.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className={ui.stateBlock} role="alert">
            <p className={ui.stateTitle}>Could not load classes</p>
            <p className={ui.stateText}>{loadError}</p>
            <Button onClick={() => void refresh()}>Try again</Button>
          </div>
        )}

        {status === 'ready' && classes.length === 0 && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>No classes yet</p>
            <p className={ui.stateText}>
              Create a class using the form above to start enrolling students.
            </p>
          </div>
        )}

        {status === 'ready' && classes.length > 0 && (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">Academic year</th>
                  <th scope="col" className={ui.actionsHeader}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classRecord) => (
                  <tr key={classRecord.id}>
                    <td className={ui.nameCell}>{classRecord.name}</td>
                    <td>
                      {classRecord.academicYear ? (
                        <span className={ui.badge}>
                          {classRecord.academicYear.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className={ui.rowActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setSelected((current) =>
                              current?.id === classRecord.id
                                ? current
                                : classRecord,
                            )
                          }
                        >
                          Manage subjects
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(classRecord)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeleteError('');
                            setDeleting(classRecord);
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

      {selected && (
        <ClassSubjectsPanel
          key={selected.id}
          classRecord={selected}
          subjects={subjects}
          onClose={() => setSelected(null)}
        />
      )}

      {editing && (
        <Modal title="Edit class" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="edit-class-name">
                Class name
              </label>
              <input
                id="edit-class-name"
                className={ui.input}
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={savingEdit}
                required
              />
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
          title="Delete class"
          message={`Delete ${deleting.name}? Classes with students or assigned subjects cannot be deleted.`}
          busy={deletingBusy}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}
