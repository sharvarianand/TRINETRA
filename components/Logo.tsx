'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'light'; 
}

export default function Logo({ size = 'md', showText = true, className = '', variant = 'default' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', svg: 32 },
    md: { icon: 'w-10 h-10', text: 'text-xl', svg: 40 },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', svg: 56 },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* TRINETRA Eye (Ashoka Chakra Pupil) - Matched to ChainSentinel Theme */}
      <div className={`${s.icon} rounded-md bg-brand-card/80 border border-brand-red/40 flex items-center justify-center shadow-[0_0_15px_var(--color-brand-red-glow)] relative overflow-hidden`}>
        
        {/* Main Logo SVG */}
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          className="w-[85%] h-[85%] relative z-10"
        >
          {/* Outer HUD Ring */}
          <circle cx="24" cy="24" r="20" stroke="var(--color-brand-red)" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
          
          {/* Cyber Eye Shape (TRINETRA) */}
          <path d="M 4 24 Q 24 8 44 24 Q 24 40 4 24 Z" stroke="var(--color-brand-text)" strokeWidth="2.5" fill="var(--color-brand-red-glow)" fillOpacity="0.08" />
          
          {/* Inner Iris boundary (Red accent to match the app's alerts) */}
          <circle cx="24" cy="24" r="9" stroke="var(--color-brand-red)" strokeWidth="1.5" opacity="0.7" />
          
          {/* Ashoka Chakra (24 Spokes simulated with strokeDasharray) - Flag Element */}
          <circle cx="24" cy="24" r="5" stroke="var(--color-brand-text)" strokeWidth="2" strokeDasharray="0.8 1.1" />
          
          {/* Center Bindu/Pupil */}
          <circle cx="24" cy="24" r="2.5" fill="var(--color-brand-red-glow)" className="animate-pulse" />
          
          {/* Crosshair accents */}
          <path d="M24 10v3 M24 35v3 M10 24h3 M35 24h3" stroke="var(--color-brand-text)" strokeWidth="1.5" opacity="0.6" />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-mono font-bold tracking-[0.2em] text-brand-text`}>
            TRINETRA
          </span>
          {size === 'lg' && (
            <span className="text-[0.6rem] text-brand-muted font-mono font-bold tracking-widest uppercase mt-0.5">
              Border Surveillance Node
            </span>
          )}
        </div>
      )}
    </div>
  );
}
