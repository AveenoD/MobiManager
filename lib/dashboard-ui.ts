/** Shared layout tokens for admin dashboard routes (Tailwind class strings). */

export type DashboardMaxWidth = '5xl' | '6xl' | '7xl';

export const dashboardMaxWidthClass: Record<DashboardMaxWidth, string> = {
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export const dashboardUi = {
  pageBg: 'min-h-screen bg-slate-50',
  padX: 'px-4 sm:px-6',
  padY: 'py-6',
  sectionGap: 'space-y-6',
  headerBar:
    'sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md',
  title: 'text-xl font-bold tracking-tight text-slate-900 sm:text-2xl',
  subtitle: 'mt-0.5 text-sm text-slate-500',
  card: 'rounded-2xl border border-slate-200/80 bg-white shadow-sm',
} as const;
