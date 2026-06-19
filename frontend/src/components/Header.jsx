import React, { useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';

export default function Header() {
  const { setShowSettings, setShowHistory } = useContext(CarbonContext);

  return (
    <header
      style={{
        height: '52px',
        backgroundColor: 'var(--carbon-bg)',
        borderBottom: '1px solid var(--carbon-border)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'between',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 40
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px' 
        }}
      >
        <span style={{ color: 'var(--carbon-leaf)', fontSize: '18px' }} role="img" aria-label="leaf">🌿</span>
        <h1
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '16px',
            color: 'var(--carbon-text-hi)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: 0
          }}
        >
          Carbon Coach
        </h1>
      </div>

      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginLeft: 'auto'
        }}
      >
        {/* History Button */}
        <button
          onClick={() => setShowHistory(true)}
          aria-label="View history and trends"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--carbon-text-mid)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease, background-color 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--carbon-text-hi)';
            e.currentTarget.style.backgroundColor = 'var(--carbon-surface-alt)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--carbon-text-mid)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--carbon-text-mid)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s ease, background-color 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--carbon-text-hi)';
            e.currentTarget.style.backgroundColor = 'var(--carbon-surface-alt)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--carbon-text-mid)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
