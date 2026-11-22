'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '../../lib/api';
import { resultsApi } from '../../lib/results';
import {
  formatAverage,
  formatRank,
  type StudentReport,
  type SubjectResult,
} from '../../types/result';
import { Button } from '../ui/button';
import { Feedback } from '../ui/feedback';
import ui from '../ui/dashboard.module.css';
import styles from './report-card.module.css';

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

function statusText(student: StudentReport): string {
  if (student.isComplete) {
    return 'Complete';
  }
  return 'Pending';
}

export function ReportCard() {
  const [report, setReport] = useState<StudentReport | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    let active = true;

    const studentId = window.location.pathname.split('/').pop() ?? '';

    resultsApi
      .studentReport(studentId)
      .then((data) => {
        if (!active) {
          return;
        }
        setReport(data);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }
        const apiError = err as ApiError;
        if (apiError.status === 404) {
          setReport(null);
          setStatus('ready');
          return;
        }
        setError(messageFor(err));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  function handlePrint() {
    window.print();
  }

  const notFound = status === 'ready' && !report;
  const subjectRows = report?.subjectResults ?? [];

  return (
    <div className={ui.stack}>
      {status === 'loading' && (
        <div className={ui.stateBlock}>
          <p className={ui.stateTitle}>Loading report card</p>
          <p className={ui.stateText}>
            Fetching student results from the Acadly API.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className={`${ui.stateBlock} ${styles.inlineState}`} role="alert">
          <p className={ui.stateTitle}>Could not load report card</p>
          <p className={ui.stateText}>{error}</p>
          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
            <Link href="/reports" className={styles.backLink}>
              Back to class results
            </Link>
          </div>
        </div>
      )}

      {notFound && (
        <div className={ui.stateBlock}>
          <p className={ui.stateTitle}>Student not found</p>
          <p className={ui.stateText}>
            The requested student report card could not be found.
          </p>
          <Link href="/reports" className={styles.backLink}>
            Back to class results
          </Link>
        </div>
      )}

      {report && status === 'ready' && (
        <>
          <section className={ui.card}>
            <div className={ui.cardHeader}>
              <div>
                <h2 className={ui.cardTitle}>Report card</h2>
                <p className={ui.cardSubtitle}>
                  {report.student.firstName} {report.student.lastName}
                </p>
              </div>
              <div className={styles.headerActions}>
                <Button variant="secondary" onClick={handlePrint}>
                  Print Report Card
                </Button>
                <Link href="/reports" className={styles.backLink}>
                  Back to class results
                </Link>
              </div>
            </div>
          </section>

          <section
            className={`${styles.report} ${styles.printable}`}
            id="report-card"
          >
            <header className={styles.reportHeader}>
              <div className={styles.school}>
                <p className={styles.schoolName}>Lead Training Center</p>
                <p className={styles.schoolDocument}>STUDENT REPORT CARD</p>
              </div>
              <div className={styles.reportMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Academic year</span>
                  <span className={styles.metaValue}>
                    {report.academicYear?.name ?? '—'}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Class</span>
                  <span className={styles.metaValue}>{report.class.name}</span>
                </div>
              </div>
            </header>

            <div className={styles.studentInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Student number</span>
                <span className={`${styles.infoValue} ${ui.mono}`}>
                  {report.student.studentNumber}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Full name</span>
                <span className={styles.infoValue}>
                  {report.student.firstName} {report.student.lastName}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Class</span>
                <span className={styles.infoValue}>{report.class.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Academic year</span>
                <span className={styles.infoValue}>
                  {report.academicYear?.name ?? '—'}
                </span>
              </div>
            </div>

            <section className={styles.subjectsSection}>
              <h3 className={styles.sectionTitle}>Subject results</h3>
              <table className={styles.subjectTable}>
                <thead>
                  <tr>
                    <th scope="col">Subject code</th>
                    <th scope="col">Subject name</th>
                    <th scope="col" className={styles.scoreCell}>
                      Coefficient
                    </th>
                    <th scope="col" className={styles.scoreCell}>
                      Sequence 1
                    </th>
                    <th scope="col" className={styles.scoreCell}>
                      Sequence 2
                    </th>
                    <th scope="col" className={styles.scoreCell}>
                      Sequence 3
                    </th>
                    <th scope="col" className={styles.scoreCell}>
                      Subject average
                    </th>
                    <th scope="col" className={styles.statusCell}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjectRows.map((subject) => (
                    <tr key={subject.subjectId}>
                      <td className={ui.mono}>{subject.subjectCode}</td>
                      <td className={ui.nameCell}>{subject.subjectName}</td>
                      <td className={styles.scoreCell}>
                        {formatAverage(subject.coefficient)}
                      </td>
                      <td className={styles.scoreCell}>
                        {formatAverage(subject.sequence1)}
                      </td>
                      <td className={styles.scoreCell}>
                        {formatAverage(subject.sequence2)}
                      </td>
                      <td className={styles.scoreCell}>
                        {formatAverage(subject.sequence3)}
                      </td>
                      <td className={styles.scoreCell}>
                        {formatAverage(subject.subjectAverage)}
                      </td>
                      <td className={styles.statusCell}>
                        <span
                          className={`${ui.badge} ${
                            subject.isComplete ? ui.badgeActive : ui.badgeAccent
                          }`}
                        >
                          {subject.isComplete ? 'Complete' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={styles.generalSection}>
              <h3 className={styles.sectionTitle}>General result</h3>
              <div className={styles.generalGrid}>
                <div className={styles.generalItem}>
                  <span className={styles.generalLabel}>
                    General average / 20
                  </span>
                  <span className={styles.generalValue}>
                    {formatAverage(report.generalAverage)}
                  </span>
                </div>
                <div className={styles.generalItem}>
                  <span className={styles.generalLabel}>Class rank</span>
                  <span className={styles.generalValue}>
                    {formatRank(report.classRank)}
                  </span>
                </div>
                <div className={styles.generalItem}>
                  <span className={styles.generalLabel}>Performance</span>
                  <span className={styles.generalValue}>
                    {report.performanceComment ?? '—'}
                  </span>
                </div>
                <div className={styles.generalItem}>
                  <span className={styles.generalLabel}>Status</span>
                  <span
                    className={`${styles.generalValue} ${
                      report.isComplete ? styles.complete : styles.pending
                    }`}
                  >
                    {statusText(report)}
                  </span>
                </div>
              </div>

              {!report.isComplete && (
                <p className={styles.pendingNote}>
                  This result is incomplete because one or more sequence marks
                  are missing. No general average, rank or performance comment
                  is assigned until all sequences are recorded.
                </p>
              )}
            </section>

            <footer className={styles.reportFooter}>
              <p className={styles.footerNote}>
                Generated by the Acadly academic management system.
              </p>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
