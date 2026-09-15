'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  color?: 'red' | 'blue' | 'amber' | 'red' | 'zinc';
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
    red: { bg: 'bg-brand-red/10', text: 'text-brand-red' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    zinc: { bg: 'bg-zinc-100', text: 'text-zinc-600' },
  };

  const styles = colorStyles[color];

  return (
    <div className={`bg-white rounded-xl p-5 border border-zinc-100 shadow-sm ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.text}`} />
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            change.startsWith('+') ? 'bg-brand-card text-brand-muted' : 
            change.startsWith('-') ? 'bg-red-50 text-red-700' : 
            'bg-zinc-100 text-zinc-600'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  );
}




