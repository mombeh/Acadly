'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { classesApi } from '../../lib/classes';
import { studentsApi } from '../../lib/students';
import type { SchoolClass } from '../../types/class';
import type { Student } from '../../types/student';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { Feedback } from '../ui/feedback';
import { Modal } from '../ui/modal';
import ui from '../ui/dashboard.module.css';
import styles from './students-manager.module.css';

type Status = 'loading' | 'ready' | 'error';

interface FeedbackState {
  tone: 'success' | 'error';
  message: string;
}

interface StudentFormState {
  studentNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
}

const emptyForm: StudentFormState = {
  studentNumber: '',
  firstName: '',
  lastName: '',
  classId: '',
};

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

export function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<StudentFormState>(emptyForm);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      studentsApi.list(filterClassId || undefined),
      classesApi.list(),
    ])
      .then(([studentList, classList]) => {
        if (!active) {
          return;
        }
        setStudents(studentList);
        setClasses(classList);
        setForm((current) =>
          current.classId
            ? current
            : { ...current, classId: classList[0]?.id ?? '' },
        );
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
  }, [filterClassId]);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setLoadError('');

    try {
      const [studentList, classList] = await Promise.all([
        studentsApi.list(filterClassId || undefined),
        classesApi.list(),
      ]);
      setStudents(studentList);
      setClasses(classList);
      setStatus('ready');
    } catch (error) {
      setLoadError(messageFor(error));
      setStatus('error');
    }
  }, [filterClassId]);

  function updateForm(patch: Partial<StudentFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function validate(values: StudentFormState): string | null {
    if (!values.studentNumber.trim()) {
      return 'Student number is required.';
    }
    if (!values.firstName.trim()) {
      return 'First name is required.';
    }
    if (!values.lastName.trim()) {
      return 'Last name is required.';
    }
    if (!values.classId) {
      return 'Select a class for the student.';
    }
    return null;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setFeedback(null);
    setSubmitting(true);

    try {
      const created = await studentsApi.create({
        studentNumber: form.studentNumber.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        classId: form.classId,
      });
      setForm({ ...emptyForm, classId: form.classId });
      setFeedback({
        tone: 'success',
        message: `Registered ${created.firstName} ${created.lastName}.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(student: Student) {
    setEditing(student);
    setEditForm({
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      classId: student.classId,
    });
    setEditError('');
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) {
      return;
    }

    const validationError = validate(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditError('');
    setSavingEdit(true);

    try {
      const updated = await studentsApi.update(editing.id, {
        studentNumber: editForm.studentNumber.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        classId: editForm.classId,
      });
      setEditing(null);
      setFeedback({
        tone: 'success',
        message: `Updated ${updated.firstName} ${updated.lastName}.`,
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
      const name = `${deleting.firstName} ${deleting.lastName}`;
      await studentsApi.remove(deleting.id);
      setDeleting(null);
      setFeedback({
        tone: 'success',
        message: `Deleted ${name}.`,
      });
      await refresh();
    } catch (error) {
      setDeleteError(messageFor(error));
    } finally {
      setDeletingBusy(false);
    }
  }

  const noClasses = status === 'ready' && classes.length === 0;
  const selectedFilterClass = classes.find(
    (classRecord) => classRecord.id === filterClassId,
  );

  return (
    <div className={ui.stack}>
      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Register a student</h2>
            <p className={ui.cardSubtitle}>
              Students are enrolled into a class within an academic year.
            </p>
          </div>
        </div>

        {noClasses ? (
          <div className={ui.notice}>
            <span>Create a class before registering students.</span>
            <Link href="/classes" className={ui.noticeLink}>
              Go to Classes
            </Link>
          </div>
        ) : (
          <form
            className={`${ui.form} ${styles.studentForm}`}
            onSubmit={handleCreate}
            noValidate
          >
            <div className={ui.field}>
              <label className={ui.label} htmlFor="student-number">
                Student number
              </label>
              <input
                id="student-number"
                className={ui.input}
                type="text"
                placeholder="STU-0001"
                value={form.studentNumber}
                onChange={(event) =>
                  updateForm({ studentNumber: event.target.value })
                }
                disabled={submitting || status !== 'ready'}
                required
              />
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="student-first-name">
                First name
              </label>
              <input
                id="student-first-name"
                className={ui.input}
                type="text"
                value={form.firstName}
                onChange={(event) =>
                  updateForm({ firstName: event.target.value })
                }
                disabled={submitting || status !== 'ready'}
                required
              />
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="student-last-name">
                Last name
              </label>
              <input
                id="student-last-name"
                className={ui.input}
                type="text"
                value={form.lastName}
                onChange={(event) =>
                  updateForm({ lastName: event.target.value })
                }
                disabled={submitting || status !== 'ready'}
                required
              />
            </div>

            <div className={ui.field}>
              <label className={ui.label} htmlFor="student-class">
                Class
              </label>
              <select
                id="student-class"
                className={ui.select}
                value={form.classId}
                onChange={(event) =>
                  updateForm({ classId: event.target.value })
                }
                disabled={submitting || status !== 'ready'}
                required
              >
                <option value="">Select a class</option>
                {classes.map((classRecord) => (
                  <option key={classRecord.id} value={classRecord.id}>
                    {classRecord.name}
                    {classRecord.academicYear
                      ? ` - ${classRecord.academicYear.name}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={submitting || status !== 'ready'}>
              {submitting ? 'Registering...' : 'Register student'}
            </Button>
          </form>
        )}

        {formError && <p className={ui.formError}>{formError}</p>}
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Students</h2>
            <p className={ui.cardSubtitle}>
              {status === 'ready'
                ? `${students.length} ${
                    students.length === 1 ? 'student' : 'students'
                  } ${
                    selectedFilterClass
                      ? `in ${selectedFilterClass.name}`
                      : 'enrolled'
                  }`
                : 'Loading students'}
            </p>
          </div>

          <div className={styles.toolbar}>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="student-filter">
                Filter by class
              </label>
              <select
                id="student-filter"
                className={ui.select}
                value={filterClassId}
                onChange={(event) => {
                  setStatus('loading');
                  setFilterClassId(event.target.value);
                }}
                disabled={status === 'loading' && students.length === 0}
              >
                <option value="">All classes</option>
                {classes.map((classRecord) => (
                  <option key={classRecord.id} value={classRecord.id}>
                    {classRecord.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => void refresh()}
              disabled={status === 'loading'}
            >
              Refresh
            </Button>
          </div>
        </div>

        {status === 'loading' && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Loading students</p>
            <p className={ui.stateText}>
              Fetching student records from the Acadly API.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className={ui.stateBlock} role="alert">
            <p className={ui.stateTitle}>Could not load students</p>
            <p className={ui.stateText}>{loadError}</p>
            <Button onClick={() => void refresh()}>Try again</Button>
          </div>
        )}

        {status === 'ready' && students.length === 0 && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>
              {filterClassId
                ? 'No students in this class'
                : 'No students registered'}
            </p>
            <p className={ui.stateText}>
              {filterClassId
                ? 'Try another class filter or register a student above.'
                : 'Register a student using the form above.'}
            </p>
            {filterClassId && (
              <Button variant="secondary" onClick={() => setFilterClassId('')}>
                Show all students
              </Button>
            )}
          </div>
        )}

        {status === 'ready' && students.length > 0 && (
          <div className={ui.tableWrapper}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope="col">Student number</th>
                  <th scope="col">Name</th>
                  <th scope="col">Class</th>
                  <th scope="col" className={ui.actionsHeader}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className={ui.mono}>{student.studentNumber}</td>
                    <td className={ui.nameCell}>
                      {student.firstName} {student.lastName}
                    </td>
                    <td>
                      <span className={ui.badge}>{student.class.name}</span>
                    </td>
                    <td>
                      <div className={ui.rowActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEdit(student)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDeleteError('');
                            setDeleting(student);
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
        <Modal
          title={`Edit ${editing.firstName} ${editing.lastName}`}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleUpdate} noValidate>
            <div className={styles.editGrid}>
              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-student-number">
                  Student number
                </label>
                <input
                  id="edit-student-number"
                  className={ui.input}
                  type="text"
                  value={editForm.studentNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      studentNumber: event.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  required
                />
              </div>

              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-student-first-name">
                  First name
                </label>
                <input
                  id="edit-student-first-name"
                  className={ui.input}
                  type="text"
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  required
                />
              </div>

              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-student-last-name">
                  Last name
                </label>
                <input
                  id="edit-student-last-name"
                  className={ui.input}
                  type="text"
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  required
                />
              </div>

              <div className={ui.field}>
                <label className={ui.label} htmlFor="edit-student-class">
                  Class
                </label>
                <select
                  id="edit-student-class"
                  className={ui.select}
                  value={editForm.classId}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      classId: event.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((classRecord) => (
                    <option key={classRecord.id} value={classRecord.id}>
                      {classRecord.name}
                    </option>
                  ))}
                </select>
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
          title="Delete student"
          message={`Delete ${deleting.firstName} ${deleting.lastName} (${deleting.studentNumber})? Students with recorded marks cannot be deleted.`}
          busy={deletingBusy}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  );
}
