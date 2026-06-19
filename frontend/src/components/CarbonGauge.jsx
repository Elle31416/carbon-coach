import React, { useEffect, useState } from 'react';

export default function CarbonGauge({ total }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate values on load and change
  useEffect(() => {
    const value = total !== null ? total : 0;
    const timeout = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timeout);
  }, [total]);

  // Geometry parameters
  const cx = 100;
  const cy = 70;
  const r = 55;
  const sweepAngle = 240; // 210 to -30
  
  // Circumference calculations
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * (sweepAngle / 360);
  
  // Calculate percentage of progress vs 24t maximum
  const maxFootprint = 24;
  const progressRatio = Math.min(animatedValue / maxFootprint, 1);
  const strokeDashoffset = arcLength * (1 - progressRatio);

  // Dynamic color logic based on emission level
  let strokeColor = 'var(--carbon-leaf)'; // 0 - 2t
  if (animatedValue > 6.0) {
    strokeColor = '#D94F4F'; // >6t Red alert
  } else if (animatedValue > 2.0) {
    strokeColor = 'var(--carbon-ember)'; // 2t - 6t Amber warning
  }

  // Calculate coordinates for the 2t sustainable limit tick mark
  // 2t is 2/24 = 1/12th of the way along the sweep starting at 210 degrees
  // 210 - (240 * (2/24)) = 190 degrees
  const tickAngleRad = (190 * Math.PI) / 180;
  const tickX1 = cx + (r - 4) * Math.cos(tickAngleRad);
  const tickY1 = cy + (r - 4) * Math.sin(tickAngleRad);
  const tickX2 = cx + (r + 4) * Math.cos(tickAngleRad);
  const tickY2 = cy + (r + 4) * Math.sin(tickAngleRad);
  
  // Label text anchor position offset slightly outwards
  const labelX = cx + (r + 14) * Math.cos(tickAngleRad);
  const labelY = cy + (r + 14) * Math.sin(tickAngleRad) + 3;

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 0',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div 
        style={{
          position: 'relative',
          width: '200px',
          height: '135px'
        }}
      >
        <svg 
          viewBox="0 0 200 140"
          style={{ width: '100%', height: '100%' }}
          role="img"
          aria-label={total !== null ? `Carbon footprint gauge: ${total.toFixed(1)} tonnes CO2e per year` : 'Carbon footprint gauge: estimate unavailable'}
        >
          {/* Track Arc */}
          <path
            d="M 52.37 97.5 A 55 55 0 1 1 147.63 97.5"
            fill="none"
            stroke="var(--carbon-border)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Progress Arc */}
          <path
            d="M 52.37 97.5 A 55 55 0 1 1 147.63 97.5"
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 800ms ease-out, stroke 800ms ease'
            }}
          />

          {/* Threshold Tick Mark (2t) */}
          <line
            x1={tickX1}
            y1={tickY1}
            x2={tickX2}
            y2={tickY2}
            stroke="var(--carbon-border)"
            strokeWidth="2"
          />

          {/* Target Label */}
          <text
            x={labelX}
            y={labelY}
            fill="var(--carbon-text-lo)"
            fontSize="10"
            fontFamily="var(--font-sans), sans-serif"
            fontWeight="500"
            textAnchor="end"
          >
            target
          </text>
        </svg>

        {/* Center Display Texts */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '0',
            right: '0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 'var(--text-2xl)',
              color: 'var(--carbon-text-hi)',
              fontWeight: 500,
              lineHeight: '1.2'
            }}
          >
            {total !== null ? total.toFixed(1) : '—'}
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 'var(--text-xs)',
              color: 'var(--carbon-text-lo)',
              marginTop: '2px'
            }}
          >
            t CO₂e / yr est.
          </span>
        </div>
      </div>

      {/* Subtext description below the gauge */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 'var(--text-sm)',
          color: 'var(--carbon-text-mid)',
          textAlign: 'center',
          marginTop: '8px',
          padding: '0 16px',
          lineHeight: '1.4'
        }}
      >
        {total === null ? (
          <span style={{ color: 'var(--carbon-text-lo)' }}>
            Tell me about your lifestyle to get your estimate.
          </span>
        ) : total <= 2.0 ? (
          <span>Below the sustainable target 🌿</span>
        ) : (
          <span>~{(total / 2.0).toFixed(1)}× the 2t sustainable limit</span>
        )}
      </p>
    </div>
  );
}
