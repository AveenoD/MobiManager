'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import {
  dashboardUi,
  dashboardMaxWidthClass,
  type DashboardMaxWidth,
} from '@/lib/dashboard-ui';

export function DashboardBackLink({
  href = '/dashboard',
  className = '',
  ariaLabel = 'Back',
}: {
  href?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 ${className}`}
      aria-label={ariaLabel}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );
}

type HeaderProps = {
  backHref?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: DashboardMaxWidth;
};

export function DashboardPageHeader({
  backHref = '/dashboard',
  title,
  description,
  actions,
  maxWidth = '7xl',
}: HeaderProps) {
  const mw = dashboardMaxWidthClass[maxWidth];
  return (
    <header className={dashboardUi.headerBar}>
      <div className={`mx-auto w-full ${mw} ${dashboardUi.padX} py-4`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <DashboardBackLink href={backHref} />
            <div className="min-w-0 pt-0.5">
              <h1 className={dashboardUi.title}>{title}</h1>
              {description ? (
                <div className={dashboardUi.subtitle}>{description}</div>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function DashboardPageFrame({ children }: { children: React.ReactNode }) {
  return <div className={dashboardUi.pageBg}>{children}</div>;
}

type ContentProps = {
  children: React.ReactNode;
  maxWidth?: DashboardMaxWidth;
  className?: string;
};

export function DashboardPageContent({
  children,
  maxWidth = '7xl',
  className = '',
}: ContentProps) {
  const mw = dashboardMaxWidthClass[maxWidth];
  return (
    <div
      className={`mx-auto w-full ${mw} ${dashboardUi.padX} ${dashboardUi.padY} ${dashboardUi.sectionGap} ${className}`}
    >
      {children}
    </div>
  );
}
