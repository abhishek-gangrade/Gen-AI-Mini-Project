import React from 'react';

export const Logo = ({ size = 'md', showText = true, variant = 'dark', className = '' }) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subtextSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  };

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* ResolveAI Custom SVG Logo Mark */}
      <div className={`${iconSizes[size] || iconSizes.md} shrink-0 drop-shadow-sm`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#312E81" />
              <stop offset="45%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient id="logoRStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#EEF2FF" />
            </linearGradient>
            <linearGradient id="logoSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>

          {/* Rounded Squircle Container */}
          <rect width="100" height="100" rx="26" fill="url(#logoBgGrad)" />

          {/* Subtle Precision Border */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="23"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />

          {/* Stylized Stem of the "R" */}
          <rect x="23" y="24" width="11" height="52" rx="5.5" fill="url(#logoRStroke)" />

          {/* Upper Loop of the "R" */}
          <path
            d="M 32 24 H 54 C 68 24, 76 33, 76 43 C 76 53, 68 60, 54 60 H 32"
            fill="none"
            stroke="url(#logoRStroke)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forward Resolution Kick / Sweep */}
          <path
            d="M 47 52 C 54 52, 60 59, 64 66 L 71 76"
            fill="none"
            stroke="url(#logoRStroke)"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Central AI Convergence Star / Intelligence Node */}
          <path
            d="M 54 36 Q 54 44 46 44 Q 54 44 54 52 Q 54 44 62 44 Q 54 44 54 36 Z"
            fill="url(#logoSparkGrad)"
          />
          <circle cx="54" cy="44" r="2.2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography: ResolveAI */}
      {showText && (
        <div className="leading-tight select-none">
          <div className="flex items-center space-x-1">
            <span
              className={`font-bold tracking-tight ${
                variant === 'light' ? 'text-white' : 'text-slate-900'
              } ${textSizes[size] || textSizes.md}`}
            >
              Resolve
            </span>
            <span
              className={`font-extrabold bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent ${
                textSizes[size] || textSizes.md
              }`}
            >
              AI
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded border border-brand-200 ml-1">
              PRO
            </span>
          </div>
          <p
            className={`text-slate-500 tracking-normal hidden sm:block ${
              subtextSizes[size] || subtextSizes.md
            }`}
          >
            Intelligent Customer Support
          </p>
        </div>
      )}
    </div>
  );
};
