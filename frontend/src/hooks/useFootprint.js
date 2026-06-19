import { useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';

/**
 * Custom hook to access footprint estimates, breakdown categories, and scanned activities.
 */
export function useFootprint() {
  const context = useContext(CarbonContext);
  
  if (!context) {
    throw new Error('useFootprint must be used within a CarbonProvider');
  }
  
  return {
    footprint: context.footprint,
    scannedActivities: context.scannedActivities,
    adjustActivity: context.adjustActivity,
    history: context.history,
    forceRescan: context.forceRescan,
  };
}
