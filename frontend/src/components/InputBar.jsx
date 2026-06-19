import React, { useState, useRef, useEffect, useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';

export default function InputBar() {
  const { sendMessage, isLoading } = useContext(CarbonContext);
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-grow textarea height on content change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Restrict max-height to 120px as specified in spec
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    sendMessage(text);
    setText('');
    
    // Reset textarea size
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    // Send message on Enter key press without Shift
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isSendDisabled = !text.trim() || isLoading;

  return (
    <form 
      onSubmit={handleSubmit}
      style={{
        height: '72px',
        backgroundColor: 'var(--carbon-bg)',
        borderTop: '1px solid var(--carbon-border)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 10
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about flights, food, energy…"
        disabled={isLoading}
        rows={1}
        style={{
          flex: 1,
          backgroundColor: 'var(--carbon-surface)',
          border: '1px solid var(--carbon-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '10px 16px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '15px',
          color: 'var(--carbon-text-hi)',
          resize: 'none',
          maxHeight: '120px',
          outline: 'none',
          boxSizing: 'border-box',
          lineHeight: '1.4',
          transition: 'border-color 0.2s ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--carbon-leaf-dim)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--carbon-border)';
        }}
      />
      
      <button
        type="submit"
        disabled={isSendDisabled}
        aria-label="Send message"
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: isSendDisabled ? 'var(--carbon-border)' : 'var(--carbon-leaf)',
          borderRadius: '50%',
          color: '#0E1410',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isSendDisabled ? 'not-allowed' : 'pointer',
          transition: 'transform 0.1s ease, background-color 0.2s ease',
          flexShrink: 0,
          outline: 'none'
        }}
        onMouseDown={(e) => {
          if (!isSendDisabled) {
            e.currentTarget.style.transform = 'scale(0.95)';
          }
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </form>
  );
}
