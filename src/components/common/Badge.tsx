import React from 'react';
import { ProjectStatus, ProjectPriority } from '../../types/index.ts';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const styles: Record<string, { dot: string; text: string; bg: string }> = {
    'In Progress': {
      dot: 'bg-indigo-500',
      text: 'text-indigo-700 dark:text-indigo-300',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/60',
    },
    'Planning': {
      dot: 'bg-sky-500',
      text: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60',
    },
    'Completed': {
      dot: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60',
    },
    'On Hold': {
      dot: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60',
    },
    'Cancelled': {
      dot: 'bg-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    },
  };

  const style = styles[status] || {
    dot: 'bg-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/60',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="truncate max-w-[120px]">{status}</span>
    </span>
  );
};

interface PriorityBadgeProps {
  priority: string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const styles: Record<string, { text: string; bg: string; dot: string }> = {
    'Low': {
      text: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
      dot: 'bg-slate-400',
    },
    'Medium': {
      text: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/60',
      dot: 'bg-blue-500',
    },
    'High': {
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60',
      dot: 'bg-amber-500',
    },
    'Urgent': {
      text: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/60',
      dot: 'bg-rose-500',
    },
  };

  const style = styles[priority] || {
    text: 'text-teal-700 dark:text-teal-300',
    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200/60 dark:border-teal-800/60',
    dot: 'bg-teal-500',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border ${style.bg} ${style.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="truncate max-w-[120px]">{priority}</span>
    </span>
  );
};
