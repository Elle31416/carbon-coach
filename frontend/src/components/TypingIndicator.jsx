import React from 'react';

export default function TypingIndicator() {
  return (
    <div 
      className="flex items-center gap-1.5 px-4 py-3 text-[var(--carbon-text-lo)]"
      role="status"
      aria-label="Coach is typing"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
      <span className="w-1.5 h-1.5 rounded-full bg-current typing-dot" />
    </div>
  );
}
