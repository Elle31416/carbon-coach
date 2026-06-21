import React, { useContext, useState, useEffect } from 'react';
import { CarbonProvider, CarbonContext } from './context/CarbonContext';
import Header from './components/Header';
import ChatPanel from './components/ChatPanel';
import InputBar from './components/InputBar';
import Sidebar from './components/Sidebar';
import { apiRequest } from './utils/api';

export default function App() {
  return (
    <CarbonProvider>
      <AppContent />
    </CarbonProvider>
  );
}

function AppContent() {
  const {
    activeDate,
    setActiveDate,
    scannedActivities,
    adjustActivity,
    history,
    showSettings,
    setShowSettings,
    showHistory,
    setShowHistory,
    config,
    saveConfig,
    forceRescan,
  } = useContext(CarbonContext);

  const [settingsForm, setSettingsForm] = useState({ ...config });
  const [authStatus, setAuthStatus] = useState(null);

  // Sync settings form when config context is loaded
  useEffect(() => {
    setSettingsForm({ ...config });
  }, [config]);

  // Check URL parameters for OAuth redirect status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    if (auth === 'success') {
      setAuthStatus({ success: true, message: 'Google account linked successfully!' });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (auth === 'error') {
      const reason = params.get('reason') || 'Unknown error';
      setAuthStatus({ success: false, message: `Failed to link Google account: ${reason}` });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const result = await saveConfig(settingsForm);
    if (result.success) {
      setShowSettings(false);
    } else {
      alert(`Error saving configuration: ${result.error}`);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const data = await apiRequest('/api/auth-url');
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Could not generate authentication URL. Verify Client ID / Client Secret.');
      }
    } catch (err) {
      alert(`Error generating OAuth URL: ${err.message}`);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Disconnect from Google APIs?')) return;
    try {
      const data = await apiRequest('/api/disconnect-google', { method: 'POST' });
      if (data.success) {
        alert('Google account disconnected.');
        window.location.reload();
      }
    } catch (err) {
      alert(`Error disconnecting Google: ${err.message}`);
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'car': return '🚗';
      case 'rideshare': return '🚖';
      case 'transit': return '🚌';
      case 'flight_short':
      case 'flight_long': return '✈️';
      case 'biking': return '🚲';
      case 'walking': return '🥾';
      // Diet options
      case 'beef': return '🥩';
      case 'poultry': return '🍗';
      case 'plant_based': return '🥗';
      case 'standard_meal': return '🍲';
      // Shopping options
      case 'priority_shipping': return '📦';
      case 'standard_shipping': return '✉️';
      case 'skipped': return '❌';
      // Home energy options
      case 'standard_grid': return '⚡';
      default: return '📍';
    }
  };

  const renderModeOptions = (type) => {
    if (type === 'shopping') {
      return (
        <>
          <option value="priority_shipping">Priority Shipping</option>
          <option value="standard_shipping">Standard Shipping</option>
          <option value="skipped">Skipped / Carbon-Free</option>
        </>
      );
    }
    if (type === 'diet') {
      return (
        <>
          <option value="beef">Meat (Beef)</option>
          <option value="poultry">Meat (Poultry/Pork)</option>
          <option value="plant_based">Plant-Based / Vegan</option>
          <option value="standard_meal">Standard Meal</option>
          <option value="skipped">Skipped Meal</option>
        </>
      );
    }
    if (type === 'homeEnergy') {
      return (
        <>
          <option value="standard_grid">Standard Grid Power</option>
        </>
      );
    }
    return (
      <>
        <option value="car">Car</option>
        <option value="rideshare">Rideshare</option>
        <option value="transit">Transit</option>
        <option value="flight_short">Flight (Short)</option>
        <option value="flight_long">Flight (Long)</option>
        <option value="walking">Walking</option>
        <option value="biking">Biking</option>
      </>
    );
  };

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Header />

      {/* Auth Callback Alerts */}
      {authStatus && (
        <div
          style={{
            backgroundColor: authStatus.success ? '#162318' : '#3B1A1A',
            borderBottom: `1px solid ${authStatus.success ? 'var(--carbon-leaf-dim)' : '#E26B6B'}`,
            color: authStatus.success ? 'var(--carbon-leaf)' : '#E26B6B',
            padding: '10px 24px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 30
          }}
        >
          <span>{authStatus.message}</span>
          <button 
            onClick={() => setAuthStatus(null)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Panel Layout */}
      <div className="main-layout">
        {/* Left Section: Chat panel + input */}
        <div 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}
        >
          <ChatPanel />
          <InputBar />
        </div>

        {/* Right Section: Sidebar dashboard (fixed 320px / collapsable drawer on mobile) */}
        <Sidebar />
      </div>

      {/* Settings Modal Overlay */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(14, 20, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '20px'
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--carbon-surface)',
              border: '1px solid var(--carbon-border)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div 
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--carbon-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--carbon-text-hi)' }}>
                  Settings
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--carbon-text-lo)', marginTop: '2px' }}>
                  Configure credentials, database targets, and locations.
                </p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--carbon-text-lo)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  outline: 'none'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* LLM Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="gemini-api-key" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--carbon-text-hi)' }}>Gemini API Key</label>
                <input
                  id="gemini-api-key"
                  type="password"
                  value={settingsForm.geminiApiKey}
                  onChange={(e) => setSettingsForm({ ...settingsForm, geminiApiKey: e.target.value })}
                  placeholder="Enter Gemini API Key"
                  style={{
                    backgroundColor: 'var(--carbon-surface-alt)',
                    border: '1px solid var(--carbon-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    fontSize: '14px',
                    color: 'var(--carbon-text-hi)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Home and Time Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="home-location" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--carbon-text-hi)' }}>Home Location</label>
                  <input
                    id="home-location"
                    type="text"
                    value={settingsForm.homeLocation}
                    onChange={(e) => setSettingsForm({ ...settingsForm, homeLocation: e.target.value })}
                    placeholder="e.g. San Francisco, CA"
                    style={{
                      backgroundColor: 'var(--carbon-surface-alt)',
                      border: '1px solid var(--carbon-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: 'var(--carbon-text-hi)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="wakeup-time" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--carbon-text-hi)' }}>Wakeup Time</label>
                  <input
                    id="wakeup-time"
                    type="time"
                    value={settingsForm.wakeupTime}
                    onChange={(e) => setSettingsForm({ ...settingsForm, wakeupTime: e.target.value })}
                    style={{
                      backgroundColor: 'var(--carbon-surface-alt)',
                      border: '1px solid var(--carbon-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: 'var(--carbon-text-hi)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Firestore Config */}
              <div style={{ borderTop: '1px solid var(--carbon-border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--carbon-text-hi)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Firebase Firestore Database
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Project ID</label>
                      <input
                        type="text"
                        value={settingsForm.firebaseConfig?.projectId || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          firebaseConfig: { ...settingsForm.firebaseConfig, projectId: e.target.value }
                        })}
                        placeholder="Project ID"
                        style={{
                          backgroundColor: 'var(--carbon-surface-alt)',
                          border: '1px solid var(--carbon-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: 'var(--carbon-text-hi)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Client Email</label>
                      <input
                        type="text"
                        value={settingsForm.firebaseConfig?.clientEmail || ''}
                        onChange={(e) => setSettingsForm({
                          ...settingsForm,
                          firebaseConfig: { ...settingsForm.firebaseConfig, clientEmail: e.target.value }
                        })}
                        placeholder="Client Email"
                        style={{
                          backgroundColor: 'var(--carbon-surface-alt)',
                          border: '1px solid var(--carbon-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: 'var(--carbon-text-hi)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Private Key</label>
                    <textarea
                      value={settingsForm.firebaseConfig?.privateKey || ''}
                      onChange={(e) => setSettingsForm({
                        ...settingsForm,
                        firebaseConfig: { ...settingsForm.firebaseConfig, privateKey: e.target.value }
                      })}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      rows={3}
                      style={{
                        backgroundColor: 'var(--carbon-surface-alt)',
                        border: '1px solid var(--carbon-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: 'var(--carbon-text-hi)',
                        resize: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Google Integration */}
              <div style={{ borderTop: '1px solid var(--carbon-border)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--carbon-text-hi)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Google OAuth Credentials
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Client ID</label>
                      <input
                        type="password"
                        value={settingsForm.googleClientId}
                        onChange={(e) => setSettingsForm({ ...settingsForm, googleClientId: e.target.value })}
                        placeholder="Google Client ID"
                        style={{
                          backgroundColor: 'var(--carbon-surface-alt)',
                          border: '1px solid var(--carbon-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: 'var(--carbon-text-hi)',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Client Secret</label>
                      <input
                        type="password"
                        value={settingsForm.googleClientSecret}
                        onChange={(e) => setSettingsForm({ ...settingsForm, googleClientSecret: e.target.value })}
                        placeholder="Google Client Secret"
                        style={{
                          backgroundColor: 'var(--carbon-surface-alt)',
                          border: '1px solid var(--carbon-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '8px 12px',
                          fontSize: '14px',
                          color: 'var(--carbon-text-hi)',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--carbon-text-mid)' }}>Google Maps API Key</label>
                    <input
                      type="password"
                      value={settingsForm.googleApiKey}
                      onChange={(e) => setSettingsForm({ ...settingsForm, googleApiKey: e.target.value })}
                      placeholder="Maps API Key"
                      style={{
                        backgroundColor: 'var(--carbon-surface-alt)',
                        border: '1px solid var(--carbon-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '8px 12px',
                        fontSize: '14px',
                        color: 'var(--carbon-text-hi)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Google Connection Panel */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--carbon-surface-alt)',
                    border: '1px solid var(--carbon-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    marginTop: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: config.googleConnected ? 'var(--carbon-leaf)' : 'var(--carbon-text-lo)',
                        display: 'inline-block' 
                      }} 
                    />
                    <span style={{ fontSize: '13px', color: 'var(--carbon-text-mid)', fontWeight: 500 }}>
                      {config.googleConnected ? 'Connected to Google APIs' : 'Google APIs Disconnected'}
                    </span>
                  </div>

                  {config.googleConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      style={{
                        backgroundColor: '#3B1A1A',
                        color: '#E26B6B',
                        border: '1px solid #E26B6B',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      style={{
                        backgroundColor: 'var(--carbon-sky)',
                        color: '#0E1410',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  borderTop: '1px solid var(--carbon-border)',
                  paddingTop: '16px',
                  marginTop: '10px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--carbon-border)',
                    color: 'var(--carbon-text-mid)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--carbon-leaf)',
                    color: '#0E1410',
                    border: 'none',
                    fontWeight: 600,
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Save Settings
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* History and Trends Modal Overlay */}
      {showHistory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(14, 20, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 150,
            padding: '20px'
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--carbon-surface)',
              border: '1px solid var(--carbon-border)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)'
            }}
          >
            <div 
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--carbon-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--carbon-text-hi)' }}>
                  Footprint History & Activity Log
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--carbon-text-lo)', marginTop: '2px' }}>
                  View weekly footprint curves and override scanned activity transport modes.
                </p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--carbon-text-lo)',
                  cursor: 'pointer',
                  fontSize: '20px',
                  outline: 'none'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Date selector and Force Rescan */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--carbon-surface-alt)',
                  border: '1px solid var(--carbon-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="history-date" style={{ fontSize: '13px', color: 'var(--carbon-text-mid)', fontWeight: 500 }}>Select Date:</label>
                  <input
                    id="history-date"
                    type="date"
                    value={activeDate}
                    onChange={(e) => setActiveDate(e.target.value)}
                    style={{
                      backgroundColor: 'var(--carbon-surface)',
                      border: '1px solid var(--carbon-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      color: 'var(--carbon-text-hi)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <button
                  onClick={forceRescan}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--carbon-border)',
                    color: 'var(--carbon-text-hi)',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--carbon-surface-alt)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Force Rescan Today
                </button>
              </div>

              {/* 7-Day Footprint Trend Chart */}
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--carbon-text-hi)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  7-Day Trend (kg CO₂/day)
                </h3>
                {history.length > 0 ? (
                  <div 
                    style={{ 
                      height: '140px', 
                      display: 'flex', 
                      alignItems: 'end', 
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--carbon-border)',
                      paddingBottom: '10px',
                      paddingHorizontal: '12px'
                    }}
                  >
                    {history.map((day) => {
                      const carbon = day.totalCarbonKg || 0;
                      // Cap at 25kg for visual scaling
                      const heightPercent = Math.min((carbon / 25) * 100, 100);
                      
                      return (
                        <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--carbon-text-mid)', marginBottom: '4px' }}>
                            {carbon.toFixed(1)}
                          </span>
                          <div 
                            style={{ 
                              width: '28px', 
                              backgroundColor: 'var(--carbon-surface-alt)', 
                              height: '90px', 
                              borderRadius: '2px 2px 0 0',
                              display: 'flex',
                              alignItems: 'end'
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                backgroundColor: 'var(--carbon-leaf)',
                                height: `${Math.max(heightPercent, 4)}%`,
                                borderRadius: '2px 2px 0 0',
                                transition: 'height 0.5s ease'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--carbon-text-lo)', marginTop: '6px' }}>
                            {day.date.substring(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--carbon-text-lo)', fontSize: '13px', border: '1px dashed var(--carbon-border)', borderRadius: 'var(--radius-md)' }}>
                    No footprint history loaded.
                  </div>
                )}
              </div>

              {/* Scanned Activity override panel */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--carbon-text-hi)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Trip Activity Log ({activeDate})
                  </h3>
                  {scannedActivities.length > 0 && scannedActivities[0].source === 'mock' && (
                    <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(109,182,212,0.15)', color: 'var(--carbon-sky)' }}>
                      Simulated
                    </span>
                  )}
                </div>

                {scannedActivities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '240px' }}>
                    {scannedActivities.map((act) => (
                      <div
                        key={act.id}
                        style={{
                          backgroundColor: 'var(--carbon-surface-alt)',
                          border: '1px solid var(--carbon-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{getModeIcon(act.mode)}</span>
                            <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--carbon-text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {act.title}
                            </h4>
                          </div>
                          <p style={{ fontSize: '11px', color: 'var(--carbon-text-lo)', marginTop: '2px' }}>
                            {act.description}
                          </p>
                          {act.adjustedFrom && (
                            <span style={{ display: 'inline-block', fontSize: '10px', color: 'var(--carbon-leaf)', fontWeight: 500, marginTop: '4px' }}>
                              ✓ Adjusted from {act.adjustedFrom} (Saved {act.savedCarbonKg} kg CO₂)
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--carbon-text-hi)' }}>
                            {act.carbonKg} kg CO₂
                          </span>
                          
                          <select
                            value={act.mode}
                            onChange={(e) => adjustActivity(act.id, e.target.value)}
                            style={{
                              backgroundColor: 'var(--carbon-surface)',
                              border: '1px solid var(--carbon-border)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              color: 'var(--carbon-text-mid)',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            {renderModeOptions(act.type)}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--carbon-text-lo)', fontSize: '13px', border: '1px dashed var(--carbon-border)', borderRadius: 'var(--radius-md)' }}>
                    No activities scanned on this day.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
