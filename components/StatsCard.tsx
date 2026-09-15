'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  color?: 'red' | 'blue' | 'amber' | 'gray';
  className?: string;
}

export default function StatsCard({ 
  label, 
  value, 
  change, 
  icon: Icon, 
  color = 'red',
  className = '' 
}: StatsCardProps) {
  const colorStyles = {
    red: { bg: 'bg-brand-red/10 dark:bg-brand-red/20', text: 'text-brand-red dark:text-brand-red' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    gray: { bg: 'bg-gray-100 dark:bg-brand-bg', text: 'text-gray-600 dark:text-brand-muted' },
  };

  const styles = colorStyles[color];

  return (
    <div className={`bg-white dark:bg-brand-card rounded-xl p-5 border border-gray-100 dark:border-brand-border shadow-sm dark:shadow-[0_0_15px_rgba(0,0,0,0.3)] ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change.startsWith('+') ? 'bg-brand-red/10 dark:bg-brand-red/20 text-brand-red' : 
            change.startsWith('-') ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 
            'bg-gray-100 dark:bg-brand-bg text-gray-600 dark:text-brand-muted'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-brand-text">{value}</div>
      <div className="text-sm text-gray-500 dark:text-brand-muted">{label}</div>
    </div>
  );
}




