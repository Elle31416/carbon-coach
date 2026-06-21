import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { google } from 'googleapis';
import { 
  getConfig, 
  saveConfig, 
  getFootprint, 
  saveFootprint, 
  getFootprintsHistory, 
  getChatHistory, 
  saveChatHistory,
  isUsingFirestore
} from './db.js';
import { scanDayActivities, CARBON_FACTORS } from './scanner.js';
import { generateMorningQuestion, handleChatSession } from './coach.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use(limiter);

app.use(cors({
  origin: ['https://carbon-coach-mocha.vercel.app', 'https://carbon-coach-1-3hu1.onrender.com'],
  credentials: true
}));
app.use(express.json());
app.use(hpp());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend files from dist directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Get safe config (hiding secrets)
app.get('/api/config', (req, res) => {
  const config = getConfig();
  const safeConfig = {
    geminiApiKey: config.geminiApiKey ? '••••••••' : '',
    googleClientId: config.googleClientId ? '••••••••' : '',
    googleClientSecret: config.googleClientSecret ? '••••••••' : '',
    googleApiKey: config.googleApiKey ? '••••••••' : '',
    googleRedirectUri: config.googleRedirectUri,
    homeLocation: config.homeLocation,
    wakeupTime: config.wakeupTime,
    firebaseConfig: {
      projectId: config.firebaseConfig?.projectId || '',
      clientEmail: config.firebaseConfig?.clientEmail || '',
      privateKey: config.firebaseConfig?.privateKey ? '••••••••' : ''
    },
    googleConnected: !!config.googleTokens,
    isUsingFirestore: isUsingFirestore()
  };
  res.json(safeConfig);
});

// Update config
app.post('/api/config', (req, res) => {
  const currentConfig = getConfig();
  const newConfig = req.body;

  // Preserve values if they are obscured dots
  if (newConfig.geminiApiKey === '••••••••') delete newConfig.geminiApiKey;
  if (newConfig.googleClientId === '••••••••') delete newConfig.googleClientId;
  if (newConfig.googleClientSecret === '••••••••') delete newConfig.googleClientSecret;
  if (newConfig.googleApiKey === '••••••••') delete newConfig.googleApiKey;
  if (newConfig.firebaseConfig?.privateKey === '••••••••') {
    newConfig.firebaseConfig.privateKey = currentConfig.firebaseConfig?.privateKey;
  }

  // Handle nested object merge for firebaseConfig
  if (newConfig.firebaseConfig) {
    newConfig.firebaseConfig = {
      ...currentConfig.firebaseConfig,
      ...newConfig.firebaseConfig
    };
  }

  try {
    const updated = saveConfig(newConfig);
    // Restart/re-schedule cron when wakeupTime changes
    setupMorningCron();
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      isUsingFirestore: isUsingFirestore()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Google OAuth URL
app.get('/api/auth-url', (req, res) => {
  const config = getConfig();
  if (!config.googleClientId || !config.googleClientSecret) {
    return res.status(400).json({ error: 'OAuth credentials not configured' });
  }

  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // force refresh token
  });

  res.json({ url });
});

// Google OAuth redirect callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect('/?auth=error&reason=no_code');
  }

  const config = getConfig();
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    saveConfig({ googleTokens: tokens });
    console.log('Google API tokens exchanged and saved successfully.');
    res.redirect('/?auth=success');
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.redirect(`/?auth=error&reason=${encodeURIComponent(error.message)}`);
  }
});

// Disconnect Google account
app.post('/api/disconnect-google', (req, res) => {
  try {
    saveConfig({ googleTokens: null });
    res.json({ success: true, message: 'Google account disconnected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger scan for a specific date (YYYY-MM-DD)
app.post('/api/scan', async (req, res) => {
  const dateStr = req.body.date || new Date().toISOString().split('T')[0];
  const force = req.body.force === true;

  try {
    // Check if we already have scanned data
    const existing = await getFootprint(dateStr);
    if (existing && !force) {
      return res.json(existing);
    }

    console.log(`Scanning activities for date: ${dateStr} (Force: ${force})`);
    const result = await scanDayActivities(dateStr);
    
    // Generate morning coach coaching question
    const morningQuestion = await generateMorningQuestion(result.activities, result.totalCarbonKg);

    const saved = await saveFootprint(dateStr, {
      activities: result.activities,
      totalCarbonKg: result.totalCarbonKg,
      morningQuestion,
      isMock: result.isMock
    });

    // Also populate initial chat history with the coach's morning question if empty
    const chat = await getChatHistory(dateStr);
    if (chat.length === 0) {
      await saveChatHistory(dateStr, [{
        sender: 'coach',
        text: morningQuestion,
        timestamp: new Date().toISOString()
      }]);
    }

    res.json(saved);
  } catch (error) {
    console.error(`Error scanning activities for ${dateStr}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get footprint history
app.get('/api/footprints', async (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  try {
    const data = await getFootprintsHistory(limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat history for date
app.get('/api/chat/:date', async (req, res) => {
  const date = req.params.date;
  try {
    const messages = await getChatHistory(date);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post message to chat for date
app.post('/api/chat/:date', async (req, res) => {
  const date = req.params.date;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    const messages = await getChatHistory(date);
    const footprint = await getFootprint(date) || { activities: [], totalCarbonKg: 0 };

    // Append user message
    const userMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    messages.push(userMsg);

    // Call Gemini coach
    const coachResponse = await handleChatSession(messages.slice(0, -1), text, footprint.activities);
    
    // Append coach response
    const coachMsg = {
      sender: 'coach',
      text: coachResponse.reply,
      timestamp: new Date().toISOString(),
      adjustment: coachResponse.carbonAdjustment
    };
    messages.push(coachMsg);

    // Save chat
    await saveChatHistory(date, messages);

    // Apply carbon adjustment if coach identified a behavioral adjustment or new log entry
    let footprintAdjusted = false;
    if (coachResponse.carbonAdjustment) {
      const adj = coachResponse.carbonAdjustment;
      
      if (adj.activityId) {
        const actIdx = footprint.activities.findIndex(a => a.id === adj.activityId);
        
        if (actIdx !== -1) {
          const act = footprint.activities[actIdx];
          const oldMode = act.mode;
          const newMode = adj.newMode;
          
          if (CARBON_FACTORS[newMode] !== undefined) {
            const oldCarbon = act.carbonKg;
            const newCarbon = act.distanceKm !== undefined ? (act.distanceKm * CARBON_FACTORS[newMode]) : CARBON_FACTORS[newMode];
            
            act.mode = newMode;
            act.carbonKg = Math.round(newCarbon * 10) / 10;
            act.adjustedFrom = oldMode;
            act.savedCarbonKg = Math.round((oldCarbon - newCarbon) * 10) / 10;

            // Re-calculate total
            const totalCarbon = footprint.activities.reduce((acc, a) => acc + a.carbonKg, 0);
            footprint.totalCarbonKg = Math.round(totalCarbon * 10) / 10;
            footprintAdjusted = true;

            await saveFootprint(date, footprint);
          }
        }
      } else if (adj.newActivity) {
        const newAct = {
          id: `chat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          source: 'chat',
          time: new Date().toISOString(),
          ...adj.newActivity
        };
        
        // Calculate emissions dynamically based on mode factor
        if (newAct.carbonKg === undefined) {
          const factor = CARBON_FACTORS[newAct.mode] || 0;
          const rawEmissions = newAct.distanceKm !== undefined ? (newAct.distanceKm * factor) : factor;
          newAct.carbonKg = Math.round(rawEmissions * 10) / 10;
        }

        footprint.activities.push(newAct);

        // Re-calculate total
        const totalCarbon = footprint.activities.reduce((acc, a) => acc + a.carbonKg, 0);
        footprint.totalCarbonKg = Math.round(totalCarbon * 10) / 10;
        footprintAdjusted = true;

        await saveFootprint(date, footprint);
      }
    }

    res.json({
      reply: coachResponse.reply,
      messages,
      footprint,
      adjusted: footprintAdjusted
    });
  } catch (error) {
    console.error(`Error sending chat message for ${date}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Manually adjust an activity travel mode
app.post('/api/adjust-activity', async (req, res) => {
  const { date, activityId, newMode } = req.body;
  if (!date || !activityId || !newMode) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (CARBON_FACTORS[newMode] === undefined) {
    return res.status(400).json({ error: 'Invalid travel mode' });
  }

  try {
    const footprint = await getFootprint(date);
    if (!footprint) {
      return res.status(404).json({ error: 'Footprint not found for this date' });
    }

    const actIdx = footprint.activities.findIndex(a => a.id === activityId);
    if (actIdx === -1) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const act = footprint.activities[actIdx];
    const oldCarbon = act.carbonKg;
    const oldMode = act.mode;

    act.mode = newMode;
    const carbonVal = act.distanceKm !== undefined ? (act.distanceKm * CARBON_FACTORS[newMode]) : CARBON_FACTORS[newMode];
    act.carbonKg = Math.round(carbonVal * 10) / 10;
    act.adjustedFrom = oldMode;
    act.savedCarbonKg = Math.round((oldCarbon - act.carbonKg) * 10) / 10;

    // Recalculate
    const totalCarbon = footprint.activities.reduce((acc, a) => acc + a.carbonKg, 0);
    footprint.totalCarbonKg = Math.round(totalCarbon * 10) / 10;

    await saveFootprint(date, footprint);

    res.json({ success: true, footprint });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup Morning Scheduler
let morningJob = null;

function setupMorningCron() {
  const config = getConfig();
  const wakeupTime = config.wakeupTime || '07:00';
  const [hour, minute] = wakeupTime.split(':');

  if (morningJob) {
    morningJob.stop();
    console.log('Stopped existing morning scheduler.');
  }

  // Cron pattern: minute hour * * *
  const cronPattern = `${minute} ${hour} * * *`;
  morningJob = cron.schedule(cronPattern, async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    console.log(`[SCHEDULED JOB] Waking up Carbon Coach at ${wakeupTime}. Scanning activities for ${todayStr}...`);
    try {
      const result = await scanDayActivities(todayStr);
      const question = await generateMorningQuestion(result.activities, result.totalCarbonKg);
      
      await saveFootprint(todayStr, {
        activities: result.activities,
        totalCarbonKg: result.totalCarbonKg,
        morningQuestion: question,
        isMock: result.isMock
      });

      // Save initial chat history
      await saveChatHistory(todayStr, [{
        sender: 'coach',
        text: question,
        timestamp: new Date().toISOString()
      }]);

      console.log(`[SCHEDULED JOB] Coach greeting prepared for ${todayStr}. Total projected carbon: ${result.totalCarbonKg} kg CO2.`);
    } catch (err) {
      console.error('[SCHEDULED JOB] Failed to complete morning scan:', err);
    }
  });

  console.log(`Scheduled morning scan daily at ${wakeupTime} (Pattern: "${cronPattern}")`);
}

// Start cron scheduler
setupMorningCron();

// Catch-all route for React SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Carbon Coach Backend running on port ${PORT}`);
  });
}

export default app;
