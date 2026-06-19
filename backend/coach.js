import { GoogleGenAI } from '@google/genai';
import { getConfig } from './db.js';

// Helper to initialize Gemini Client
function getGeminiClient() {
  const config = getConfig();
  if (!config.geminiApiKey) {
    console.warn('Gemini API Key is missing. Check your settings.');
    return null;
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
}

// Generate the daily morning coaching question
export async function generateMorningQuestion(activities, totalCarbonKg) {
  const ai = getGeminiClient();
  
  if (!ai) {
    return "Good morning! Please configure your Gemini API Key in Settings to enable your personal Carbon Coach. In the meantime, I see you have some activities today—let's think about how we can keep our carbon footprint low!";
  }

  const activitiesSummary = activities.map(act => 
    `- ${act.title} (${act.description || act.type}): ${act.distanceKm || 0} km via ${act.mode || 'unknown'} (${act.carbonKg || 0} kg CO2)`
  ).join('\n');

  const systemInstruction = `You are Carbon Coach, a warm, encouraging, and expert AI coach helping the user reduce their carbon footprint.
You review their calendar and travel details for the day and start the morning with a check-in.
Follow these rules:
1. Greet the user warmly (it is morning).
2. Summarize their projected carbon footprint for today: ${totalCarbonKg} kg CO2.
3. Highlight the most carbon-intensive activity.
4. Ask exactly ONE targeted, open-ended question to help them find a lower-carbon alternative for today (e.g. taking transit, walking, carpooling, combining trips, or skipping unnecessary travel).
5. Keep the total response short and friendly (maximum 3-4 sentences).
6. Do NOT write in markdown code blocks or use HTML. Use a direct, conversational tone.`;

  const prompt = `Here are the scanned activities for today:
${activitiesSummary || 'No travel or calendar events found for today.'}

Total projected carbon: ${totalCarbonKg} kg CO2.

Please generate the morning greeting and single question.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    return response.text.trim();
  } catch (error) {
    console.error('Error generating morning question from Gemini:', error);
    return `Good morning! I had trouble reaching my green database, but I see you have ${activities.length} activities planned. Let's make sustainable choices today! (Error: ${error.message})`;
  }
}

// Handle continuing conversation with Gemini
export async function handleChatSession(chatHistory, userMessage, activities) {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      reply: "Please configure your Gemini API Key in Settings to chat with your Carbon Coach.",
      carbonAdjustment: null
    };
  }

  const activitiesSummary = activities.map(act => {
    if (act.type === 'shopping' || act.type === 'diet' || act.type === 'homeEnergy') {
      return `- [ID: ${act.id}] ${act.title} (${act.type}): ${act.carbonKg} kg CO2 (Mode/Option: ${act.mode || 'unknown'}${act.cost ? `, Cost: $${act.cost}` : ''})`;
    }
    return `- [ID: ${act.id}] ${act.title} (${act.type}): ${act.distanceKm || 0} km via ${act.mode || 'unknown'} (${act.carbonKg || 0} kg CO2)`;
  }).join('\n');

  const systemInstruction = `You are Carbon Coach, a warm, encouraging, and expert AI coach helping the user reduce their carbon footprint.
You are in the middle of a chat session with the user about their activities today:
${activitiesSummary || 'No activities logged for today.'}

Your goals:
1. Answer the user's message in a helpful, supportive, and motivating way. Keep responses under 4 sentences.
2. If the user commits to a lower-carbon choice for an existing activity (e.g., "I will walk instead of drive for the gym session" or "I'll choose the plant-based burger option"), identify the activity ID and the new mode.
3. If they change their travel or lifestyle behavior for an existing activity, you must output a structured JSON block at the very end of your response inside a \`\`\`json ... \`\`\` block with this schema:
   {
     "activityId": "the-activity-id",
     "newMode": "transit" | "walking" | "biking" | "car" | "rideshare" | "plant_based" | "standard_shipping" | "skipped",
     "explanation": "Brief explanation of the adjustment"
   }
4. If the user tells you about an outdoor workout, gym trip, grocery shop, or retail purchase that is NOT in the list, you can dynamically ADD it to their log by outputting this JSON block:
   {
     "newActivity": {
       "type": "calendar" | "rideshare" | "flight" | "diet" | "shopping",
       "title": "e.g., 5km Outdoor Jog" | "e.g., Whole Foods Grocery Purchase",
       "mode": "walking" | "biking" | "transit" | "car" | "rideshare" | "plant_based" | "standard_meal" | "beef" | "standard_shipping" | "priority_shipping",
       "distanceKm": 5.0,
       "description": "Short summary of activity",
       "cost": 15.50
     },
     "explanation": "Brief explanation of adding the activity"
   }
Only output the JSON block if the user explicitly agreed to make a change or declared a new activity. Otherwise, output a normal conversational reply without any JSON block.`;

  // Format history for Gemini API
  // Translate chatHistory [{ sender: 'coach'|'user', text: '...' }] into Gemini contents format
  const contents = chatHistory.map(msg => ({
    role: msg.sender === 'coach' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  // Append user's new message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7
      }
    });

    const text = response.text.trim();
    
    // Parse any JSON block in the response
    let reply = text;
    let carbonAdjustment = null;

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        carbonAdjustment = JSON.parse(jsonMatch[1]);
        // Remove the JSON block from the user-facing reply
        reply = text.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
      } catch (err) {
        console.error('Failed to parse carbon adjustment JSON from Gemini output:', err);
      }
    }

    return {
      reply,
      carbonAdjustment
    };
  } catch (error) {
    console.error('Error handling chat session with Gemini:', error);
    return {
      reply: `I ran into an issue processing that. Can you try again? (Error: ${error.message})`,
      carbonAdjustment: null
    };
  }
}
