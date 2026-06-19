import React, { useEffect, useState } from 'react';

export default function EmissionBreakdown({ categories }) {
  const [widths, setWidths] = useState({
    travel: 0,
    homeEnergy: 0,
    diet: 0,
    shopping: 0,
  });

  // Calculate percentage of bar width relative to an 8-tonne category limit
  const maxCategoryTonnes = 8.0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidths({
        travel: categories?.travel ? Math.min((categories.travel / maxCategoryTonnes) * 100, 100) : 0,
        homeEnergy: categories?.homeEnergy ? Math.min((categories.homeEnergy / maxCategoryTonnes) * 100, 100) : 0,
        diet: categories?.diet ? Math.min((categories.diet / maxCategoryTonnes) * 100, 100) : 0,
        shopping: categories?.shopping ? Math.min((categories.shopping / maxCategoryTonnes) * 100, 100) : 0,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [categories]);

  const categoryItems = [
    {
      key: 'travel',
      label: 'Travel',
      value: categories?.travel,
      color: 'var(--carbon-ember)',
      delay: '0ms',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.7.1-2.1.8l-.5.9c-.3.6-.1 1.4.5 1.8l6.8 4.2-2.8 2.8-3.4-1c-.6-.2-1.3 0-1.7.5L1 18.5c-.4.4-.3 1.1.2 1.3l3.5 1.8 1.8 3.5c.2.5.9.6 1.3.2l1.8-1.1c.5-.4.7-1.1.5-1.7l-1-3.4 2.8-2.8 4.2 6.8c.4.6 1.2.8 1.8.5l.9-.5c.7-.4 1-1.2.8-2.1z"/>
        </svg>
      )
    },
    {
      key: 'homeEnergy',
      label: 'Home energy',
      value: categories?.homeEnergy,
      color: 'var(--carbon-sky)',
      delay: '80ms',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      )
    },
    {
      key: 'diet',
      label: 'Diet',
      value: categories?.diet,
      color: 'var(--carbon-leaf)',
      delay: '160ms',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8A7 7 0 0 1 11 20z"/>
          <path d="M9 22v-4"/>
        </svg>
      )
    },
    {
      key: 'shopping',
      label: 'Shopping',
      value: categories?.shopping,
      color: '#9B8FD4',
      delay: '240ms',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
      )
    }
  ];

  return (
    <div 
      style={{
        padding: '16px 20px',
        width: '100%',
        boxSizing: 'border-box',
        borderTop: '1px solid var(--carbon-border)',
        borderBottom: '1px solid var(--carbon-border)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {categoryItems.map((item) => {
          const hasVal = item.value !== null && item.value !== undefined;
          const displayVal = hasVal ? `${item.value.toFixed(1)} t` : '?';

          return (
            <div key={item.key} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Label Row */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}
              >
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    color: 'var(--carbon-text-mid)'
                  }}
                >
                  <span style={{ color: hasVal ? item.color : 'var(--carbon-text-lo)' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                
                <span 
                  style={{ 
                    fontFamily: "'IBM Plex Mono', monospace", 
                    fontSize: '13px', 
                    color: hasVal ? 'var(--carbon-text-hi)' : 'var(--carbon-text-lo)',
                    fontWeight: 500
                  }}
                >
                  {displayVal}
                </span>
              </div>

              {/* Progress Bar Track */}
              <div 
                style={{ 
                  backgroundColor: 'var(--carbon-border)', 
                  height: '4px', 
                  borderRadius: '2px', 
                  width: '100%',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    backgroundColor: hasVal ? item.color : 'var(--carbon-text-lo)', 
                    height: '100%', 
                    borderRadius: '2px', 
                    width: `${widths[item.key]}%`,
                    transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
                    transitionDelay: item.delay
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
