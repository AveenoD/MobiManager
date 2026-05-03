'use client';

import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

type StatColor = 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'indigo';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: StatColor;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  href?: string;
  className?: string;
}

const colorStyles: Record<StatColor, { bg: string; icon: string; value: string }> = {
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    value: 'text-emerald-600',
  },
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    value: 'text-blue-600',
  },
  orange: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    value: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    value: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    value: 'text-purple-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    value: 'text-indigo-600',
  },
};

export function StatCard({ title, value, icon: Icon, color, trend, subtitle, href, className = '' }: StatCardProps) {
  const styles = colorStyles[color];
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px -12px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
      className={`
        bg-white rounded-2xl border border-slate-100 p-5
        hover:shadow-lg cursor-pointer
        ${className}
      `}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.icon}`} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{title}</p>
      </div>
      {subtitle && (
        <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
      )}
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}