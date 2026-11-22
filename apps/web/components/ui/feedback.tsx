import type { ReactNode } from 'react';
import styles from './feedback.module.css';

interface FeedbackProps {
  tone: 'success' | 'error';
  children: ReactNode;
}

export function Feedback({ tone, children }: FeedbackProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`${styles.feedback} ${
        tone === 'success' ? styles.success : styles.error
      }`}
    >
      {children}
    </p>
  );
}
