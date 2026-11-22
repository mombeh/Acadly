'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api';
import { academicYearsApi } from '../../lib/academic-years';
import type { AcademicYear } from '../../types/academic-year';
import styles from './academic-years-manager.module.css';

type Status = 'loading' | 'ready' | 'error';

interface Feedback {
  tone: 'success' | 'error';
  message: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

export function AcademicYearsManager() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    academicYearsApi
      .list(controller.signal)
      .then((data) => {
        setYears(data);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(messageFor(error));
        setStatus('error');
      });

    return () => controller.abort();
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setLoadError('');

    try {
      const data = await academicYearsApi.list();
      setYears(data);
      setStatus('ready');
    } catch (error) {
      setLoadError(messageFor(error));
      setStatus('error');
    }
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Start date and end date are required.');
      return;
    }
    if (endDate <= startDate) {
      setFormError('End date must be later than the start date.');
      return;
    }

    setFormError('');
    setFeedback(null);
    setSubmitting(true);

    try {
      const created = await academicYearsApi.create({
        name: trimmedName,
        startDate,
        endDate,
      });
      setName('');
      setStartDate('');
      setEndDate('');
      setFeedback({
        tone: 'success',
        message: `Created the ${created.name} academic year.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(year: AcademicYear) {
    setFeedback(null);
    setPendingActionId(year.id);

    try {
      const updated = await academicYearsApi.activate(year.id);
      setFeedback({
        tone: 'success',
        message: `${updated.name} is now the active academic year.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleDelete(year: AcademicYear) {
    if (confirmingId !== year.id) {
      setConfirmingId(year.id);
      return;
    }

    setFeedback(null);
    setPendingActionId(year.id);

    try {
      await academicYearsApi.remove(year.id);
      setFeedback({
        tone: 'success',
        message: `Deleted the ${year.name} academic year.`,
      });
      await refresh();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFor(error) });
    } finally {
      setConfirmingId(null);
      setPendingActionId(null);
    }
  }

  const busy = submitting || pendingActionId !== null;

  return (
    <div className={styles.stack}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Create an academic year</h2>
            <p className={styles.cardSubtitle}>
              Define the session period and later mark one year as active.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleCreate} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="academic-year-name">
              Name
            </label>
            <input
              id="academic-year-name"
              className={styles.input}
              type="text"
              placeholder="2026 / 2027"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="academic-year-start">
              Start date
            </label>
            <input
              id="academic-year-start"
              className={styles.input}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="academic-year-end">
              End date
            </label>
            <input
              id="academic-year-end"
              className={styles.input}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create academic year'}
          </button>
        </form>

        {formError && <p className={styles.formError}>{formError}</p>}
      </section>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={`${styles.feedback} ${
            feedback.tone === 'success'
              ? styles.feedbackSuccess
              : styles.feedbackError
          }`}
        >
          {feedback.message}
        </p>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Academic years</h2>
            <p className={styles.cardSubtitle}>
              {status === 'ready'
                ? `${years.length} ${
                    years.length === 1 ? 'year' : 'years'
                  } configured`
                : 'Loading configured years'}
            </p>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void refresh()}
            disabled={status === 'loading' || busy}
          >
            Refresh
          </button>
        </div>

        {status === 'loading' && (
          <div className={styles.skeleton} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        )}

        {status === 'error' && (
          <div className={styles.stateBlock} role="alert">
            <p className={styles.stateTitle}>Could not load academic years</p>
            <p className={styles.stateText}>{loadError}</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && years.length === 0 && (
          <div className={styles.stateBlock}>
            <p className={styles.stateTitle}>No academic years yet</p>
            <p className={styles.stateText}>
              Create your first academic year using the form above.
            </p>
          </div>
        )}

        {status === 'ready' && years.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Period</th>
                  <th scope="col">Status</th>
                  <th scope="col" className={styles.actionsHeader}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => {
                  const isPending = pendingActionId === year.id;
                  return (
                    <tr key={year.id}>
                      <td className={styles.nameCell}>{year.name}</td>
                      <td>
                        {formatDate(year.startDate)} &ndash;{' '}
                        {formatDate(year.endDate)}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            year.isActive ? styles.badgeActive : ''
                          }`}
                        >
                          {year.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => void handleActivate(year)}
                            disabled={busy || year.isActive}
                          >
                            {isPending && !confirmingId
                              ? 'Activating...'
                              : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className={
                              confirmingId === year.id
                                ? styles.dangerButton
                                : styles.secondaryButton
                            }
                            onClick={() => void handleDelete(year)}
                            disabled={busy}
                          >
                            {confirmingId === year.id
                              ? 'Confirm delete'
                              : 'Delete'}
                          </button>
                          {confirmingId === year.id && (
                            <button
                              type="button"
                              className={styles.ghostButton}
                              onClick={() => setConfirmingId(null)}
                              disabled={busy}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
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
