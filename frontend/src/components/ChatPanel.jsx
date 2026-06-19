import React, { useEffect, useRef, useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function ChatPanel() {
  const { messages, sendMessage, isLoading } = useContext(CarbonContext);
  const chatEndRef = useRef(null);

  // Auto-scroll to the bottom of the chat when new messages arrive or loading status changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handlePillClick = (text) => {
    sendMessage(text);
  };

  const starterPrompts = [
    "How bad are my weekly flights?",
    "Is plant-based eating worth it?",
    "How can I reduce home energy?",
    "What's my estimated footprint?"
  ];

  return (
    <div 
      className="chat-panel-container"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'transparent'
      }}
      role="log"
      aria-live="polite"
    >
      <div 
        style={{
          maxWidth: '680px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: messages.length === 0 ? 'center' : 'flex-start'
        }}
      >
        {messages.length === 0 ? (
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 0'
            }}
          >
            <h2 
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '22px',
                color: 'var(--carbon-text-hi)',
                fontWeight: 500,
                marginBottom: '10px'
              }}
            >
              What's your biggest carbon habit?
            </h2>
            <p 
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '15px',
                color: 'var(--carbon-text-mid)',
                marginBottom: '24px',
                maxWidth: '400px'
              }}
            >
              Ask me anything — flights, diet, home energy, shopping.
            </p>
            
            <div 
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                maxWidth: '480px'
              }}
            >
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePillClick(prompt)}
                  style={{
                    border: '1px solid var(--carbon-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--carbon-sky)',
                    borderRadius: '99px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
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
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                onPillClick={handlePillClick}
              />
            ))}
          </div>
        )}
        
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', marginBottom: '16px' }}>
            <TypingIndicator />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
