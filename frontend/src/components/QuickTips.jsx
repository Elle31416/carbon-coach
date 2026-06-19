import React, { useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';

export default function QuickTips() {
  const { tips, sendMessage, messages } = useContext(CarbonContext);

  const handleLearnMore = (tipText) => {
    sendMessage(`Tell me more about: ${tipText}`);
  };

  const getImpactStyle = (impact) => {
    switch (impact?.toUpperCase()) {
      case 'HIGH':
        return {
          backgroundColor: '#3B1A1A',
          color: '#E26B6B',
          text: 'high impact',
        };
      case 'MEDIUM':
        return {
          backgroundColor: '#2A2415',
          color: '#D4A84E',
          text: 'medium',
        };
      case 'LOW':
      default:
        return {
          backgroundColor: '#162318',
          color: '#4CAF7D',
          text: 'low impact',
        };
    }
  };

  // Render two placeholder skeletons with animated shimmer before any conversation starts
  const showSkeletons = messages.length === 0 || tips.length === 0;

  return (
    <div 
      style={{
        padding: '16px 20px',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden'
      }}
    >
      <h3
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '11px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--carbon-text-lo)',
          marginBottom: '10px'
        }}
      >
        Coach suggests
      </h3>

      <div 
        style={{ 
          overflowY: 'auto', 
          flex: 1, 
          paddingRight: '2px'
        }}
      >
        {showSkeletons ? (
          <>
            {/* Skeleton 1 */}
            <div 
              className="shimmer-bg" 
              style={{
                height: '76px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '8px',
                border: '1px solid var(--carbon-border)'
              }}
            />
            {/* Skeleton 2 */}
            <div 
              className="shimmer-bg" 
              style={{
                height: '76px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '8px',
                border: '1px solid var(--carbon-border)'
              }}
            />
          </>
        ) : (
          tips.map((tip, idx) => {
            const badge = getImpactStyle(tip.impact);
            return (
              <div
                key={idx}
                className="animate-fade-in"
                style={{
                  backgroundColor: 'var(--carbon-surface)',
                  border: '1px solid var(--carbon-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Impact Badge */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '9px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '99px',
                      backgroundColor: badge.backgroundColor,
                      color: badge.color
                    }}
                  >
                    {badge.text}
                  </span>
                </div>

                {/* Tip text */}
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '13px',
                    color: 'var(--carbon-text-mid)',
                    lineHeight: '1.5',
                    paddingRight: '4px'
                  }}
                >
                  {tip.text}
                </p>

                {/* Learn more link */}
                <button
                  onClick={() => handleLearnMore(tip.text)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '12px',
                    color: 'var(--carbon-sky)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    padding: '0',
                    cursor: 'pointer',
                    outline: 'none',
                    alignSelf: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Learn more ↗
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
