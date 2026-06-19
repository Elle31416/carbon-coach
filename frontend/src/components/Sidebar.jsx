import React, { useState, useContext } from 'react';
import { CarbonContext } from '../context/CarbonContext';
import CarbonGauge from './CarbonGauge';
import EmissionBreakdown from './EmissionBreakdown';
import QuickTips from './QuickTips';

export default function Sidebar() {
  const { footprint } = useContext(CarbonContext);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <aside 
      className={`sidebar-container ${drawerOpen ? 'drawer-open' : 'drawer-closed'}`}
    >
      {/* Mobile drawer handle tab (hidden on desktop) */}
      <div 
        className="sidebar-mobile-header" 
        onClick={toggleDrawer}
        role="button"
        aria-expanded={drawerOpen}
        aria-label="Toggle footprint details panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🌿</span>
          <span style={{ fontWeight: 600 }}>My Footprint</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {footprint.total !== null && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 600 }}>
              {footprint.total.toFixed(1)} t CO₂e
            </span>
          )}
          <span style={{ fontSize: '12px' }}>{drawerOpen ? '▼' : '▲'}</span>
        </div>
      </div>

      {/* Main Sidebar Contents */}
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          overflow: 'hidden',
          height: '100%'
        }}
      >
        <CarbonGauge total={footprint.total} />
        <EmissionBreakdown categories={footprint.categories} />
        <QuickTips />
      </div>
    </aside>
  );
}
