import Link from 'next/link';
import styles from './page.module.css';

const modules = [
  {
    href: '/academic-years',
    title: 'Academic Years',
    description: 'Create the school sessions and select the active year.',
  },
  {
    href: '/classes',
    title: 'Classes',
    description: 'Organise cohorts within each academic year.',
  },
  {
    href: '/students',
    title: 'Students',
    description: 'Manage learner records and enrolments.',
  },
  {
    href: '/subjects',
    title: 'Subjects',
    description: 'Maintain the subject catalogue and coefficients.',
  },
  {
    href: '/marks',
    title: 'Marks',
    description: 'Record assessments and student results.',
  },
  {
    href: '/reports',
    title: 'Reports',
    description: 'Review performance and export academic data.',
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Welcome back</p>
        <h2 className={styles.heroTitle}>Simplifying Academic Management.</h2>
        <p className={styles.heroText}>
          Acadly keeps academic years, classes, students, subjects, and marks in
          one place. Start with an academic year, then build your classes and
          enrolments on top of it.
        </p>
        <Link href="/academic-years" className={styles.heroAction}>
          Manage academic years
        </Link>
      </section>

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className={styles.sectionTitle}>
          Modules
        </h2>
        <div className={styles.grid}>
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={styles.moduleCard}
            >
              <h3 className={styles.moduleTitle}>{module.title}</h3>
              <p className={styles.moduleText}>{module.description}</p>
              <span className={styles.moduleLink}>Open</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
