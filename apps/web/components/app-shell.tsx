'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import styles from './app-shell.module.css';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/academic-years', label: 'Academic Years' },
  { href: '/classes', label: 'Classes' },
  { href: '/students', label: 'Students' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/marks', label: 'Marks' },
  { href: '/reports', label: 'Reports' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function pageTitle(pathname: string): string {
  const match = navItems.find((item) => isActive(pathname, item.href));
  return match?.label ?? 'Acadly';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.brand}>
          <span className={styles.brandMark}>A</span>
          <div>
            <p className={styles.brandName}>Acadly</p>
            <p className={styles.brandTagline}>Academic management</p>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${
                isActive(pathname, item.href) ? styles.navLinkActive : ''
              }`}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <h1 className={styles.pageTitle}>{pageTitle(pathname)}</h1>
          <div className={styles.user}>
            <span className={styles.avatar}>AD</span>
            <span className={styles.userName}>Administrator</span>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
