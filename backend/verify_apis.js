import { getConfig, saveFootprint, getFootprint, getFootprintsHistory, isUsingFirestore } from './db.js';
import { scanDayActivities } from './scanner.js';
import { generateMorningQuestion, handleChatSession } from './coach.js';

async function runTests() {
  console.log('=== STARTING CARBON COACH BACKEND VERIFICATION ===');
  
  // 1. Test Database Config Loading
  console.log('\n[1/4] Testing Configuration...');
  const config = getConfig();
  console.log('Successfully loaded config.json.');
  console.log('Database Mode:', isUsingFirestore() ? 'Firestore' : 'Local JSON File');
  
  // 2. Test Scanning mock data
  console.log('\n[2/4] Testing Scanner (Simulated Mode)...');
  const todayStr = new Date().toISOString().split('T')[0];
  const scanResult = await scanDayActivities(todayStr, true);
  console.log(`Scan result for ${todayStr}:`);
  console.log(`- Activities Found: ${scanResult.activities.length}`);
  console.log(`- Total Carbon Projected: ${scanResult.totalCarbonKg} kg CO2`);
  
  // 3. Test Database reads and writes
  console.log('\n[3/4] Testing Database Read/Write...');
  await saveFootprint(todayStr, {
    activities: scanResult.activities,
    totalCarbonKg: scanResult.totalCarbonKg,
    isMock: true
  });
  
  const savedRecord = await getFootprint(todayStr);
  if (savedRecord && savedRecord.totalCarbonKg === scanResult.totalCarbonKg) {
    console.log('✔ Successfully saved and retrieved footprint record.');
  } else {
    console.error('❌ Failed database footprint validation!');
  }
  
  const history = await getFootprintsHistory(5);
  console.log(`✔ Footprint history retrieved. Total records: ${history.length}`);

  // 4. Test Gemini Coaching (Mock if no key)
  console.log('\n[4/4] Testing Gemini Carbon Coach...');
  if (!config.geminiApiKey) {
    console.log('⚠ Gemini API Key not set in config.json. Testing fallback greeting...');
    const greeting = await generateMorningQuestion(scanResult.activities, scanResult.totalCarbonKg);
    console.log('Fallback Coach Message:', greeting);
  } else {
    console.log('Gemini API Key detected. Fetching live response...');
    try {
      const greeting = await generateMorningQuestion(scanResult.activities, scanResult.totalCarbonKg);
      console.log('Live Coach Greeting:', greeting);
      
      console.log('Testing Chat Session...');
      const chatResponse = await handleChatSession(
        [{ sender: 'coach', text: greeting, timestamp: new Date().toISOString() }],
        "I'll ride my bike to Equinox Gym instead of driving today.",
        scanResult.activities
      );
      console.log('Coach Chat Reply:', chatResponse.reply);
      console.log('Detected Carbon Adjustment:', chatResponse.carbonAdjustment);
    } catch (err) {
      console.error('❌ Gemini integration test failed:', err);
    }
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
}

runTests().catch(err => {
  console.error('Test Execution Failed:', err);
});
