import React from 'react';

export default function MessageBubble({ message, onPillClick }) {
  const { role, content, timestamp } = message;
  const isUser = role === 'user';

  // 1. Helper to render bracketed emission values with color logic
  const renderContentWithHighlights = (text) => {
    if (!text) return '';

    const parts = [];
    let lastIndex = 0;
    const regex = /\[(.*?)\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const textInBrackets = match[1];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Parse first number out of brackets to evaluate high vs low impact
      let isHighImpact = false;
      const numMatch = textInBrackets.match(/(-?\d+(?:\.\d+)?)/);
      if (numMatch) {
        const val = parseFloat(numMatch[1]);
        if (val > 1.0) {
          isHighImpact = true;
        }
      }

      const badgeColor = isHighImpact ? 'var(--carbon-ember)' : 'var(--carbon-leaf)';

      parts.push(
        <code
          key={matchIndex}
          style={{
            backgroundColor: 'var(--carbon-surface-alt)',
            color: badgeColor,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid var(--carbon-border)',
            display: 'inline-block',
            margin: '0 2px'
          }}
        >
          {textInBrackets}
        </code>
      );

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // 2. Parse text to separate paragraph prose, comparison blocks, and action suggestion pills
  const parseMessageStructure = () => {
    const pills = [];
    
    // Extract [[Explicit Pills]] first
    const explicitPillRegex = /\[\[(.*?)\]\]/g;
    let match;
    let contentWithoutExplicitPills = content;
    while ((match = explicitPillRegex.exec(content)) !== null) {
      pills.push(match[1]);
    }
    contentWithoutExplicitPills = content.replace(explicitPillRegex, '').trim();

    // Parse bullet points at the end of the message to turn them into clickable pills
    const lines = contentWithoutExplicitPills.split('\n');
    const normalLines = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•');
      const isQuestionOrAction = trimmed.toLowerCase().includes('tell me') || 
                                 trimmed.toLowerCase().includes('how can') || 
                                 trimmed.toLowerCase().includes('what is') || 
                                 trimmed.length < 45;

      if (isBullet && isQuestionOrAction) {
        const pillText = trimmed.replace(/^[-*•]\s*/, '').trim();
        if (pillText) {
          pills.push(pillText);
        }
      } else {
        normalLines.push(line);
      }
    });

    const bodyText = normalLines.join('\n').trim();
    const paragraphs = bodyText.split('\n\n');

    const renderedParagraphs = paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      // Render blockquotes as structured comparison blocks
      if (trimmedPara.startsWith('>')) {
        const cleanQuoteText = trimmedPara.replace(/^>\s*/, '');
        return (
          <div
            key={index}
            style={{
              backgroundColor: 'var(--carbon-surface)',
              borderLeft: '3px solid var(--carbon-leaf-dim)',
              padding: '10px 14px',
              borderRadius: `0 var(--radius-md) var(--radius-md) 0`,
              fontSize: '13px',
              color: 'var(--carbon-text-mid)',
              marginBottom: '12px'
            }}
          >
            {renderContentWithHighlights(cleanQuoteText)}
          </div>
        );
      }

      return (
        <p key={index} style={{ marginBottom: '12px' }}>
          {renderContentWithHighlights(trimmedPara)}
        </p>
      );
    });

    return {
      renderedParagraphs,
      pills
    };
  };

  const { renderedParagraphs, pills } = parseMessageStructure();
  const timeString = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isUser) {
    return (
      <div 
        role="article" 
        aria-label="Your message"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px',
          width: '100%'
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--carbon-surface-alt)',
            border: '1px solid var(--carbon-border)',
            borderRadius: '14px 14px 2px 14px',
            padding: '10px 14px',
            maxWidth: '72%',
            fontFamily: "'Inter', sans-serif",
            fontSize: '15px',
            color: 'var(--carbon-text-hi)',
            wordBreak: 'break-word'
          }}
        >
          <p>{content}</p>
          <span 
            style={{
              display: 'block',
              textAlign: 'right',
              fontSize: '10px',
              color: 'var(--carbon-text-lo)',
              marginTop: '4px'
            }}
          >
            {timeString}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      role="article" 
      aria-label="Assistant message"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: '16px',
        maxWidth: '84%',
        width: '100%'
      }}
    >
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '15px',
          color: 'var(--carbon-text-mid)',
          lineHeight: '1.7',
          width: '100%'
        }}
      >
        {renderedParagraphs}
        
        {/* Render Action Pills */}
        {pills.length > 0 && (
          <div
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginTop: '10px',
              width: '100%'
            }}
          >
            {pills.map((pillText, idx) => (
              <button
                key={idx}
                onClick={() => onPillClick(pillText)}
                style={{
                  border: '1px solid var(--carbon-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--carbon-sky)',
                  borderRadius: '99px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--carbon-surface-alt)';
                  e.currentTarget.style.borderColor = 'var(--carbon-sky)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--carbon-border)';
                }}
              >
                {pillText}
              </button>
            ))}
          </div>
        )}
      </div>
      <span 
        style={{
          fontSize: '10px',
          color: 'var(--carbon-text-lo)',
          marginTop: '6px'
        }}
      >
        {timeString}
      </span>
    </div>
  );
}
