'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { academicYearsApi } from '../../lib/academic-years';
import { classesApi } from '../../lib/classes';
import { resultsApi } from '../../lib/results';
import {
  formatAverage,
  formatRank,
  type ClassResult,
  type ClassStudentResult,
} from '../../types/result';
import type { AcademicYear } from '../../types/academic-year';
import type { SchoolClass } from '../../types/class';
import { Button } from '../ui/button';
import { Feedback } from '../ui/feedback';
import ui from '../ui/dashboard.module.css';
import styles from './class-results-manager.module.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface FeedbackState {
  tone: 'success' | 'error';
  message: string;
}

function messageFor(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Something went wrong. Please try again.';
}

function statusText(student: ClassStudentResult): string {
  if (student.isComplete) {
    return 'Complete';
  }
  return 'Pending';
}

export function ClassResultsManager() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [metaStatus, setMetaStatus] = useState<LoadStatus>('loading');
  const [metaError, setMetaError] = useState('');

  const [yearId, setYearId] = useState('');
  const [classId, setClassId] = useState('');

  const [results, setResults] = useState<ClassResult | null>(null);
  const [resultsStatus, setResultsStatus] = useState<LoadStatus>('loading');
  const [resultsError, setResultsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
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
        setYearId(preferred?.id ?? '');
        setClassId('');
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
  }, []);

  const filteredClasses = classes.filter(
    (classRecord) => classRecord.academicYearId === yearId,
  );

  useEffect(() => {
    let active = true;

    if (!classId) {
      return;
    }

    resultsApi
      .classResults(classId)
      .then((data) => {
        if (!active) {
          return;
        }
        setResults(data);
        setResultsStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setResultsError(messageFor(error));
        setResultsStatus('error');
      });

    return () => {
      active = false;
    };
  }, [classId, refreshKey]);

  function handleYearChange(event: ChangeEvent<HTMLSelectElement>) {
    setYearId(event.target.value);
    setClassId('');
  }

  async function handlePrint() {
    window.print();
  }

  const noYears = metaStatus === 'ready' && years.length === 0;
  const selectedYear = years.find((year) => year.id === yearId);
  const selectedClass = classes.find(
    (classRecord) => classRecord.id === classId,
  );
  const students = results?.students ?? [];
  const completeStudents = students.filter((student) => student.isComplete);
  const incompleteStudents = students.filter((student) => !student.isComplete);

  return (
    <div className={ui.stack}>
      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>Class results</h2>
            <p className={ui.cardSubtitle}>
              View class rankings and general averages by academic year.
            </p>
          </div>
        </div>

        {metaStatus === 'error' && (
          <div
            className={`${ui.stateBlock} ${styles.inlineState}`}
            role="alert"
          >
            <p className={ui.stateTitle}>Could not load academic data</p>
            <p className={ui.stateText}>{metaError}</p>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </div>
        )}

        {metaStatus === 'ready' && noYears && (
          <div className={`${ui.notice} ${styles.inlineNotice}`}>
            <span>Create an academic year before viewing results.</span>
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

        {metaStatus === 'ready' && years.length > 0 && (
          <form className={`${ui.form} ${styles.selectors}`} noValidate>
            <div className={ui.field}>
              <label className={ui.label} htmlFor="reports-year">
                Academic year
              </label>
              <select
                id="reports-year"
                className={ui.select}
                value={yearId}
                onChange={handleYearChange}
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
              <label className={ui.label} htmlFor="reports-class">
                Class
              </label>
              <select
                id="reports-class"
                className={ui.select}
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
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

            <Button
              type="button"
              variant="secondary"
              onClick={handlePrint}
              disabled={resultsStatus === 'loading' || !classId}
            >
              Print ranking
            </Button>
          </form>
        )}
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.message}</Feedback>}

      <section className={ui.card}>
        <div className={ui.cardHeader}>
          <div>
            <h2 className={ui.cardTitle}>
              {selectedClass && selectedYear
                ? `${selectedClass.name} · ${selectedYear.name}`
                : 'Class ranking'}
            </h2>
            <p className={ui.cardSubtitle}>
              {results && results.academicYear
                ? `Academic year: ${results.academicYear.name}`
                : 'Select a class to view results'}
            </p>
          </div>
        </div>

        {!classId && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Select a class</p>
            <p className={ui.stateText}>
              Choose an academic year and class above to load the class results.
            </p>
          </div>
        )}

        {classId && resultsStatus === 'loading' && (
          <div className={ui.stateBlock}>
            <p className={ui.stateTitle}>Loading results</p>
            <p className={ui.stateText}>
              Fetching class rankings and averages from the Acadly API.
            </p>
          </div>
        )}

        {classId && resultsStatus === 'error' && (
          <div
            className={`${ui.stateBlock} ${styles.inlineState}`}
            role="alert"
          >
            <p className={ui.stateTitle}>Could not load class results</p>
            <p className={ui.stateText}>{resultsError}</p>
            <Button
              onClick={() => {
                setResultsError('');
                setRefreshKey((key) => key + 1);
              }}
              disabled={!classId}
            >
              Try again
            </Button>
          </div>
        )}

        {classId &&
          resultsStatus === 'ready' &&
          results &&
          students.length === 0 && (
            <div className={ui.stateBlock}>
              <p className={ui.stateTitle}>No students in this class</p>
              <p className={ui.stateText}>
                Register students for this class before viewing results.
              </p>
              <Link href="/students" className={ui.noticeLink}>
                Go to Students
              </Link>
            </div>
          )}

        {classId &&
          resultsStatus === 'ready' &&
          results &&
          students.length > 0 && (
            <>
              <div className={styles.summary}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Students</span>
                  <span className={styles.summaryValue}>{students.length}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Complete</span>
                  <span className={styles.summaryValue}>
                    {completeStudents.length}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Pending</span>
                  <span className={styles.summaryValue}>
                    {incompleteStudents.length}
                  </span>
                </div>
              </div>

              <div className={ui.tableWrapper}>
                <table className={`${ui.table} ${styles.rankingTable}`}>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.rankCell}>
                        Rank
                      </th>
                      <th scope="col">Student number</th>
                      <th scope="col">Student name</th>
                      <th scope="col" className={styles.scoreCell}>
                        General average / 20
                      </th>
                      <th scope="col" className={styles.scoreCell}>
                        Performance
                      </th>
                      <th scope="col" className={styles.statusCell}>
                        Status
                      </th>
                      <th scope="col" className={styles.actionsHeader}>
                        Report card
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.studentId}>
                        <td className={styles.rankCell}>
                          {formatRank(student.rank)}
                        </td>
                        <td className={ui.mono}>{student.studentNumber}</td>
                        <td className={ui.nameCell}>
                          {student.firstName} {student.lastName}
                        </td>
                        <td className={styles.scoreCell}>
                          {formatAverage(student.generalAverage)}
                        </td>
                        <td className={styles.scoreCell}>
                          {student.performanceComment ?? '—'}
                        </td>
                        <td className={styles.statusCell}>
                          <span
                            className={`${ui.badge} ${
                              student.isComplete
                                ? ui.badgeActive
                                : ui.badgeAccent
                            }`}
                          >
                            {statusText(student)}
                          </span>
                        </td>
                        <td className={styles.actionsCell}>
                          <Link
                            href={`/reports/${student.studentId}`}
                            className={styles.reportLink}
                          >
                            View report
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {incompleteStudents.length > 0 && (
                <div className={styles.pendingNote}>
                  Students marked "Pending" are missing one or more sequence
                  marks and do not receive a general average or rank.
                </div>
              )}
            </>
          )}
      </section>
    </div>
  );
}
