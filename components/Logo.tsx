'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  variant?: 'default' | 'light'; // 'light' for use on dark backgrounds
}

export default function Logo({ size = 'md', showText = true, className = '', variant = 'default' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', svg: 32 },
    md: { icon: 'w-10 h-10', text: 'text-xl', svg: 40 },
    lg: { icon: 'w-14 h-14', text: 'text-2xl', svg: 56 },
  };

  const s = sizes[size];
  
  // Text colors based on variant
  const textColor = variant === 'light' 
    ? 'text-white' 
    : 'text-cyan-500 text-glow';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon - Modern Crowd + Shield Design */}
      <div className={`${s.icon} rounded bg-black border border-cyan-500/50 flex items-center justify-center shadow-lg shadow-cyan-500/20 relative overflow-hidden`}>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(90deg, white 1px, transparent 1px), linear-gradient(white 1px, transparent 1px)',
            backgroundSize: '8px 8px'
          }} />
        </div>
        {/* Main Logo SVG */}
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          className="w-[70%] h-[70%] relative z-10"
        >
          {/* Stylized crowd/people silhouettes */}
          <g opacity="0.9">
            {/* Center person (larger) */}
            <circle cx="24" cy="16" r="4" fill="white" />
            <path 
              d="M16 36c0-4.418 3.582-8 8-8s8 3.582 8 8" 
              stroke="#10b981" 
              strokeWidth="3" 
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Left person */}
            <circle cx="12" cy="20" r="3" fill="white" opacity="0.7" />
            <path 
              d="M6 36c0-3.314 2.686-6 6-6s6 2.686 6 6" 
              stroke="#10b981" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
            
            {/* Right person */}
            <circle cx="36" cy="20" r="3" fill="white" opacity="0.7" />
            <path 
              d="M30 36c0-3.314 2.686-6 6-6s6 2.686 6 6" 
              stroke="#10b981" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              fill="none"
              opacity="0.7"
            />
          </g>
          
          {/* Shield accent at bottom */}
          <path 
            d="M24 44l-8-4v-4c0-2.21 3.582-4 8-4s8 1.79 8 4v4l-8 4z" 
            fill="#10b981"
            opacity="0.3"
          />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${s.text} font-bold ${textColor} tracking-widest`}>
            TRINETRA
          </span>
          {size === 'lg' && (
            <span className="text-[0.6rem] text-cyan-600/70 font-bold tracking-widest">BORDER SEC</span>
          )}
        </div>
      )}
    </div>
  );
}
