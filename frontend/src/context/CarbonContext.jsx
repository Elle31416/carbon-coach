import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../utils/api';
import { parseCarbonData } from '../utils/parseCarbon';

export const CarbonContext = createContext();

export const CarbonProvider = ({ children }) => {
  const [activeDate, setActiveDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [messages, setMessages] = useState([]);
  const [footprint, setFootprint] = useState({
    total: null,
    categories: {
      travel: null,
      homeEnergy: null,
      diet: null,
      shopping: null,
    }
  });
  
  const [tips, setTips] = useState([]);
  const [scannedActivities, setScannedActivities] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // App Overlays State
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Config State
  const [config, setConfig] = useState({
    geminiApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
    googleApiKey: '',
    googleRedirectUri: '',
    homeLocation: '',
    wakeupTime: '',
    firebaseConfig: { projectId: '', clientEmail: '', privateKey: '' },
    googleConnected: false,
    isUsingFirestore: false
  });

  // Load backend configuration
  const loadConfig = useCallback(async () => {
    try {
      const data = await apiRequest('/api/config');
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }, []);

  // Save backend configuration
  const saveConfig = useCallback(async (updatedConfig) => {
    try {
      const data = await apiRequest('/api/config', {
        method: 'POST',
        body: JSON.stringify(updatedConfig)
      });
      if (data.success) {
        await loadConfig();
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to save configuration' };
    } catch (err) {
      console.error('Error saving config:', err);
      return { success: false, error: err.message };
    }
  }, [loadConfig]);

  // Fetch historical footprints (limit 7 for trends)
  const fetchFootprintHistory = useCallback(async () => {
    try {
      const data = await apiRequest('/api/footprints?limit=7');
      // Sort chronologically for dashboard trends
      setHistory(data.reverse());
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  // Fetch footprint and chat history for a specific date
  const fetchDateData = useCallback(async (dateStr, force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Scan/Load activities for the day
      const scanData = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ date: dateStr, force })
      });
      setScannedActivities(scanData.activities || []);

      // 2. Fetch messages for that day
      const chatData = await apiRequest(`/api/chat/${dateStr}`);
      
      // Look for any hidden carbon data comment blocks to restore category states
      let latestCarbonData = null;
      const formattedMessages = chatData.map((msg, index) => {
        const isCoach = msg.sender === 'coach';
        const role = isCoach ? 'assistant' : 'user';
        const { cleanedContent, carbonData } = parseCarbonData(msg.text);

        if (carbonData) {
          latestCarbonData = carbonData;
        }

        return {
          id: msg.id || `msg-${index}-${msg.timestamp}`,
          role,
          content: cleanedContent,
          timestamp: msg.timestamp
        };
      });

      setMessages(formattedMessages);

      if (latestCarbonData) {
        setFootprint({
          total: latestCarbonData.total,
          categories: {
            travel: latestCarbonData.categories?.travel ?? null,
            homeEnergy: latestCarbonData.categories?.homeEnergy ?? null,
            diet: latestCarbonData.categories?.diet ?? null,
            shopping: latestCarbonData.categories?.shopping ?? null,
          }
        });
        setTips(latestCarbonData.tips || []);
      } else {
        const totalKg = scanData.totalCarbonKg || 0;
        const totalTonnes = totalKg * 0.365;

        // If no messages logged, we do not show raw CO2e data on the gauge (display —)
        if (formattedMessages.length === 0) {
          setFootprint({
            total: null,
            categories: {
              travel: null,
              homeEnergy: null,
              diet: null,
              shopping: null,
            }
          });
          setTips([]);
        } else {
          const acts = scanData.activities || [];
          const getCategoryTotal = (cat) => {
            const filtered = acts.filter(act => {
              if (cat === 'travel') return act.type === 'calendar' || act.type === 'rideshare' || act.type === 'flight' || act.type === 'travel';
              if (cat === 'homeEnergy') return act.type === 'homeEnergy';
              if (cat === 'diet') return act.type === 'diet';
              if (cat === 'shopping') return act.type === 'shopping';
              return false;
            });
            if (filtered.length === 0) return null;
            return filtered.reduce((sum, act) => sum + (act.carbonKg || 0), 0) * 0.365;
          };

          setFootprint({
            total: totalTonnes,
            categories: {
              travel: getCategoryTotal('travel'),
              homeEnergy: getCategoryTotal('homeEnergy'),
              diet: getCategoryTotal('diet'),
              shopping: getCategoryTotal('shopping'),
            }
          });
          
          setTips([
            { text: 'Try walking or biking for short travel options under 5 km.', impact: 'MEDIUM' },
            { text: 'Switching to public transit helps limit commuter emissions.', impact: 'MEDIUM' }
          ]);
        }
      }

      await fetchFootprintHistory();
    } catch (err) {
      console.error('Error fetching date data:', err);
      if (err.status >= 500) {
        setError('Something went wrong on my end. Try again in a moment.');
      } else {
        setError("I couldn't reach the backend. Check that the server is running on port 3001.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFootprintHistory]);

  // Send message to assistant
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Optimistically add user message to list
    const userMsgId = `user-${Date.now()}`;
    const userMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const data = await apiRequest(`/api/chat/${activeDate}`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });

      let latestCarbonData = null;
      const formatted = data.messages.map((msg, index) => {
        const isCoach = msg.sender === 'coach';
        const role = isCoach ? 'assistant' : 'user';
        const { cleanedContent, carbonData } = parseCarbonData(msg.text);

        if (carbonData) {
          latestCarbonData = carbonData;
        }

        return {
          id: msg.id || `msg-${index}-${msg.timestamp}`,
          role,
          content: cleanedContent,
          timestamp: msg.timestamp
        };
      });

      setMessages(formatted);
      setScannedActivities(data.footprint.activities || []);

      if (latestCarbonData) {
        setFootprint({
          total: latestCarbonData.total,
          categories: {
            travel: latestCarbonData.categories?.travel ?? null,
            homeEnergy: latestCarbonData.categories?.homeEnergy ?? null,
            diet: latestCarbonData.categories?.diet ?? null,
            shopping: latestCarbonData.categories?.shopping ?? null,
          }
        });
        setTips(latestCarbonData.tips || []);
      } else {
        const totalKg = data.footprint.totalCarbonKg || 0;
        const totalTonnes = totalKg * 0.365;
        const acts = data.footprint.activities || [];
        const getCategoryTotal = (cat) => {
          const filtered = acts.filter(act => {
            if (cat === 'travel') return act.type === 'calendar' || act.type === 'rideshare' || act.type === 'flight' || act.type === 'travel';
            if (cat === 'homeEnergy') return act.type === 'homeEnergy';
            if (cat === 'diet') return act.type === 'diet';
            if (cat === 'shopping') return act.type === 'shopping';
            return false;
          });
          if (filtered.length === 0) return null;
          return filtered.reduce((sum, act) => sum + (act.carbonKg || 0), 0) * 0.365;
        };

        setFootprint({
          total: totalTonnes,
          categories: {
            travel: getCategoryTotal('travel'),
            homeEnergy: getCategoryTotal('homeEnergy'),
            diet: getCategoryTotal('diet'),
            shopping: getCategoryTotal('shopping'),
          }
        });
        setTips([
          { text: 'Try walking or biking for short travel options under 5 km.', impact: 'MEDIUM' },
          { text: 'Switching to public transit helps limit commuter emissions.', impact: 'MEDIUM' }
        ]);
      }

      if (data.adjusted) {
        await fetchFootprintHistory();
      }
    } catch (err) {
      console.error('Error sending message:', err);
      let errorMsg = "I couldn't reach the backend. Check that the server is running on port 3001.";
      if (err.status >= 500) {
        errorMsg = 'Something went wrong on my end. Try again in a moment.';
      }
      
      setError(errorMsg);

      // Append assistant error response to message list
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [activeDate, isLoading, fetchFootprintHistory]);

  // Adjust activity travel mode directly
  const adjustActivity = useCallback(async (activityId, newMode) => {
    try {
      const data = await apiRequest('/api/adjust-activity', {
        method: 'POST',
        body: JSON.stringify({ date: activeDate, activityId, newMode })
      });
      if (data.success) {
        setScannedActivities(data.footprint.activities || []);
        
        const acts = data.footprint.activities || [];
        const totalKg = data.footprint.totalCarbonKg || 0;
        const totalTonnes = totalKg * 0.365;

        const getCategoryTotal = (cat) => {
          const filtered = acts.filter(act => {
            if (cat === 'travel') return act.type === 'calendar' || act.type === 'rideshare' || act.type === 'flight' || act.type === 'travel';
            if (cat === 'homeEnergy') return act.type === 'homeEnergy';
            if (cat === 'diet') return act.type === 'diet';
            if (cat === 'shopping') return act.type === 'shopping';
            return false;
          });
          if (filtered.length === 0) return null;
          return filtered.reduce((sum, act) => sum + (act.carbonKg || 0), 0) * 0.365;
        };

        setFootprint({
          total: totalTonnes,
          categories: {
            travel: getCategoryTotal('travel'),
            homeEnergy: getCategoryTotal('homeEnergy'),
            diet: getCategoryTotal('diet'),
            shopping: getCategoryTotal('shopping'),
          }
        });

        await fetchFootprintHistory();
      }
    } catch (err) {
      console.error('Error adjusting activity:', err);
    }
  }, [activeDate, fetchFootprintHistory]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Fetch data on activeDate change
  useEffect(() => {
    fetchDateData(activeDate);
  }, [activeDate, fetchDateData]);

  return (
    <CarbonContext.Provider value={{
      activeDate,
      setActiveDate,
      messages,
      setMessages,
      footprint,
      tips,
      scannedActivities,
      history,
      isLoading,
      error,
      showSettings,
      setShowSettings,
      showHistory,
      setShowHistory,
      config,
      saveConfig,
      sendMessage,
      adjustActivity,
      forceRescan: () => fetchDateData(activeDate, true),
    }}>
      {children}
    </CarbonContext.Provider>
  );
};
