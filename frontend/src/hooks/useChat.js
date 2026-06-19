import { useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';

/**
 * Custom hook to access chat actions and messages context.
 */
export function useChat() {
  const context = useContext(CarbonContext);
  
  if (!context) {
    throw new Error('useChat must be used within a CarbonProvider');
  }
  
  return {
    messages: context.messages,
    sendMessage: context.sendMessage,
    isLoading: context.isLoading,
    error: context.error,
  };
}
