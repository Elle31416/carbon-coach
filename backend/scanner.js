import { google } from 'googleapis';
import { getConfig } from './db.js';

// Carbon coefficients (kg CO2 per unit, e.g. km for travel, or per meal/shipment)
export const CARBON_FACTORS = {
  car: 0.20,         // average passenger car
  rideshare: 0.22,   // rideshare (Uber/Lyft) including deadhead
  transit: 0.05,     // bus/train
  flight_short: 0.15, // short flight (< 1500 km)
  flight_long: 0.11,  // long flight (> 1500 km)
  walking: 0,
  biking: 0,

  // Diet factors (kg CO2 per meal/grocery scale factor)
  beef: 6.2,
  poultry: 2.4,
  plant_based: 0.5,
  standard_meal: 2.0,

  // Shopping factors (kg CO2 per order)
  priority_shipping: 4.5,
  standard_shipping: 1.5,
  skipped: 0,

  // Home energy baseline (kg CO2 per day)
  standard_grid: 2.5
};

// Simple dictionary of common airport coordinates to calculate flight distances if needed
const AIRPORTS = {
  SFO: { lat: 37.6213, lon: -122.3790 },
  JFK: { lat: 40.6413, lon: -73.7781 },
  LAX: { lat: 33.9416, lon: -118.4085 },
  ORD: { lat: 41.9742, lon: -87.9073 },
  LHR: { lat: 51.4700, lon: -0.4543 },
  CDG: { lat: 49.0097, lon: 2.5479 },
  HND: { lat: 35.5494, lon: 139.7798 },
  DXB: { lat: 25.2532, lon: 55.3657 },
  SIN: { lat: 1.3644, lon: 103.9915 },
  SYD: { lat: -33.9461, lon: 151.1772 }
};

// Setup OAuth2 client
export function getOAuthClient(config) {
  if (!config.googleClientId || !config.googleClientSecret) {
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
  if (config.googleTokens) {
    oauth2Client.setCredentials(config.googleTokens);
  }
  return oauth2Client;
}

// Calculate distance in km between two lat/lon points using Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate distance using Google Maps Distance Matrix API
async function getMapsDistance(origin, destination, apiKey) {
  if (!apiKey) {
    console.log('No Google Maps API Key provided. Estimating distance.');
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const distanceMetres = data.rows[0].elements[0].distance.value;
      const durationSeconds = data.rows[0].elements[0].duration.value;
      return {
        distanceKm: distanceMetres / 1000,
        durationMin: Math.round(durationSeconds / 60)
      };
    }
  } catch (error) {
    console.error('Error calling Google Maps Distance Matrix API:', error);
  }
  return null;
}

// Scans calendar for the day's events
async function scanCalendar(auth, dateStr, config) {
  try {
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Parse date boundary (e.g. today 00:00 to 23:59 in local time)
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59`);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    const activities = [];
    
    let previousLocation = config.homeLocation || 'San Francisco, CA';

    for (const event of events) {
      if (!event.location) continue;
      
      const summary = event.summary || 'Meeting';
      const location = event.location;
      
      // Calculate distance using Maps API if possible
      let distanceKm = 10; // Default estimate
      let durationMin = 20; // Default estimate
      let source = 'estimated';

      if (config.googleApiKey) {
        const mapsData = await getMapsDistance(previousLocation, location, config.googleApiKey);
        if (mapsData) {
          distanceKm = mapsData.distanceKm;
          durationMin = mapsData.durationMin;
          source = 'google_maps';
        }
      }

      // Determine transport mode (heuristics based on event title, e.g. "cycle", "walk", "drive")
      let mode = 'car';
      const lowercaseSummary = summary.toLowerCase();
      if (lowercaseSummary.includes('walk') || lowercaseSummary.includes('hike') || lowercaseSummary.includes('run')) {
        mode = 'walking';
      } else if (lowercaseSummary.includes('cycle') || lowercaseSummary.includes('bike')) {
        mode = 'biking';
      } else if (lowercaseSummary.includes('train') || lowercaseSummary.includes('bus') || lowercaseSummary.includes('transit') || lowercaseSummary.includes('subway') || lowercaseSummary.includes('metro')) {
        mode = 'transit';
      }

      const carbonKg = distanceKm * CARBON_FACTORS[mode];

      activities.push({
        id: `cal-${event.id}`,
        type: 'calendar',
        title: summary,
        description: `Travel from ${previousLocation} to ${location}`,
        origin: previousLocation,
        destination: location,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMin,
        mode,
        carbonKg: Math.round(carbonKg * 10) / 10,
        time: event.start.dateTime || event.start.date,
        source
      });

      previousLocation = location;
    }

    // Return trip home if active
    if (activities.length > 0 && config.homeLocation) {
      const lastLoc = activities[activities.length - 1].destination;
      if (lastLoc.toLowerCase() !== config.homeLocation.toLowerCase()) {
        let distanceKm = 10;
        let durationMin = 20;
        let source = 'estimated';
        
        if (config.googleApiKey) {
          const mapsData = await getMapsDistance(lastLoc, config.homeLocation, config.googleApiKey);
          if (mapsData) {
            distanceKm = mapsData.distanceKm;
            durationMin = mapsData.durationMin;
            source = 'google_maps';
          }
        }
        
        const mode = 'car'; // default return trip
        const carbonKg = distanceKm * CARBON_FACTORS[mode];

        activities.push({
          id: `cal-return-${dateStr}`,
          type: 'calendar',
          title: 'Return Home',
          description: `Travel back home to ${config.homeLocation}`,
          origin: lastLoc,
          destination: config.homeLocation,
          distanceKm: Math.round(distanceKm * 10) / 10,
          durationMin,
          mode,
          carbonKg: Math.round(carbonKg * 10) / 10,
          time: new Date(`${dateStr}T18:00:00`).toISOString(),
          source
        });
      }
    }

    return activities;
  } catch (error) {
    console.error('Error scanning Google Calendar:', error);
    return [];
  }
}

// Scans Gmail for travel confirmations / ride receipts
async function scanGmail(auth, dateStr) {
  try {
    const gmail = google.gmail({ version: 'v1', auth });
    
    // Scan emails from today and yesterday
    const startOfYesterday = new Date(new Date(`${dateStr}T00:00:00`).getTime() - 24 * 60 * 60 * 1000);
    const afterDateSec = Math.floor(startOfYesterday.getTime() / 1000);
    
    const query = `after:${afterDateSec} (Uber OR Lyft OR "flight confirmation" OR "boarding pass" OR "airline" OR "train ticket" OR "e-ticket" OR "order confirmation" OR "receipt" OR "DoorDash" OR "Uber Eats" OR "Instacart" OR "Starbucks" OR "Amazon" OR "shipped" OR "purchase")`;
    
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 15
    });

    const messages = listResponse.data.messages || [];
    const activities = [];

    for (const msgRef of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: msgRef.id,
        format: 'full'
      });

      const snippet = msg.data.snippet || '';
      const body = getEmailBody(msg.data);
      const headers = msg.data.payload.headers || [];
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
      const subject = subjectHeader ? subjectHeader.value : '';
      const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
      const emailTime = dateHeader ? new Date(dateHeader.value).toISOString() : new Date().toISOString();

      // Parse rideshares (Uber/Lyft)
      if (subject.toLowerCase().includes('uber') || snippet.toLowerCase().includes('uber') || subject.toLowerCase().includes('lyft') || snippet.toLowerCase().includes('lyft')) {
        let distanceKm = 8.0; // Default estimate
        let cost = 15.00;
        let provider = subject.toLowerCase().includes('lyft') ? 'Lyft' : 'Uber';

        // Parse Uber details from body (e.g. "$15.42", "5.2 mi" or "8.4 km")
        const distanceRegex = /(\d+(\.\d+)?)\s*(mi|miles|km|kilometers)/i;
        const distMatch = body.match(distanceRegex);
        if (distMatch) {
          const val = parseFloat(distMatch[1]);
          const unit = distMatch[3].toLowerCase();
          distanceKm = unit.startsWith('mi') ? val * 1.60934 : val;
        }

        const costRegex = /\$\s*(\d+(\.\d{2})?)/;
        const costMatch = body.match(costRegex);
        if (costMatch) {
          cost = parseFloat(costMatch[1]);
        }

        const carbonKg = distanceKm * CARBON_FACTORS.rideshare;

        activities.push({
          id: `gmail-${msg.data.id}`,
          type: 'rideshare',
          title: `${provider} Ride`,
          description: `Ride receipt found in Gmail (${provider} - $${cost.toFixed(2)})`,
          distanceKm: Math.round(distanceKm * 10) / 10,
          mode: 'rideshare',
          carbonKg: Math.round(carbonKg * 10) / 10,
          time: emailTime,
          cost
        });
      }
      
      // Parse flight confirmations
      else if (subject.toLowerCase().includes('flight') || subject.toLowerCase().includes('booking') || subject.toLowerCase().includes('confirmation') || snippet.toLowerCase().includes('flight')) {
        // Attempt to find airport codes SFO, JFK, LAX, etc.
        const airportRegex = /\b([A-Z]{3})\b/g;
        const matches = [...body.matchAll(airportRegex)].map(m => m[1]);
        
        // Filter valid known airports
        const foundAirports = matches.filter(code => AIRPORTS[code]);
        
        if (foundAirports.length >= 2) {
          const origin = foundAirports[0];
          const dest = foundAirports[1];
          const originCoords = AIRPORTS[origin];
          const destCoords = AIRPORTS[dest];
          
          const distanceKm = haversineDistance(originCoords.lat, originCoords.lon, destCoords.lat, destCoords.lon);
          const isShort = distanceKm < 1500;
          const factor = isShort ? CARBON_FACTORS.flight_short : CARBON_FACTORS.flight_long;
          const carbonKg = distanceKm * factor;

          activities.push({
            id: `gmail-${msg.data.id}`,
            type: 'flight',
            title: `Flight: ${origin} to ${dest}`,
            description: `Flight booking confirmation found in Gmail (${origin} ➔ ${dest})`,
            origin,
            destination: dest,
            distanceKm: Math.round(distanceKm),
            mode: isShort ? 'flight_short' : 'flight_long',
            carbonKg: Math.round(carbonKg),
            time: emailTime
          });
        } else {
          // General flight confirmation found but couldn't parse airports
          activities.push({
            id: `gmail-generic-flight-${msg.data.id}`,
            type: 'flight',
            title: `Flight Confirmation`,
            description: `Flight booking found: "${subject}" (Estimated average flight emissions)`,
            distanceKm: 1200, // standard mid-range flight
            mode: 'flight_short',
            carbonKg: 180, // estimated 180 kg CO2
            time: emailTime
          });
        }
      }

      // Parse food delivery (diet)
      else if (
        subject.toLowerCase().includes('doordash') || snippet.toLowerCase().includes('doordash') ||
        subject.toLowerCase().includes('uber eats') || snippet.toLowerCase().includes('uber eats') ||
        subject.toLowerCase().includes('grubhub') || snippet.toLowerCase().includes('grubhub') ||
        subject.toLowerCase().includes('instacart') || snippet.toLowerCase().includes('instacart') ||
        subject.toLowerCase().includes('starbucks') || snippet.toLowerCase().includes('starbucks')
      ) {
        let cost = 25.00;
        const costMatch = body.match(/\$\s*(\d+(\.\d{2})?)/);
        if (costMatch) {
          cost = parseFloat(costMatch[1]);
        }

        let provider = 'Food Delivery';
        if (body.toLowerCase().includes('doordash')) provider = 'DoorDash';
        else if (body.toLowerCase().includes('uber eats')) provider = 'Uber Eats';
        else if (body.toLowerCase().includes('instacart')) provider = 'Instacart';
        else if (body.toLowerCase().includes('starbucks')) provider = 'Starbucks';

        const isGrocery = provider === 'Instacart';
        const mode = isGrocery ? 'standard_meal' : 'beef';
        const carbonKg = isGrocery ? 10.0 : 6.2;

        activities.push({
          id: `gmail-${msg.data.id}`,
          type: 'diet',
          title: isGrocery ? `${provider} Groceries` : `${provider} Dinner`,
          description: `Food receipt found in Gmail (${provider} - $${cost.toFixed(2)})`,
          mode,
          carbonKg,
          time: emailTime,
          cost
        });
      }

      // Parse retail order (shopping)
      else if (
        subject.toLowerCase().includes('amazon') || snippet.toLowerCase().includes('amazon') ||
        subject.toLowerCase().includes('order confirmation') || subject.toLowerCase().includes('shipped') ||
        subject.toLowerCase().includes('purchase') || subject.toLowerCase().includes('receipt')
      ) {
        let cost = 45.00;
        const costMatch = body.match(/\$\s*(\d+(\.\d{2})?)/);
        if (costMatch) {
          cost = parseFloat(costMatch[1]);
        }

        let provider = 'Online Retailer';
        if (body.toLowerCase().includes('amazon')) provider = 'Amazon';

        activities.push({
          id: `gmail-${msg.data.id}`,
          type: 'shopping',
          title: `${provider} Retail Purchase`,
          description: `Retail receipt found in Gmail ($${cost.toFixed(2)})`,
          mode: 'standard_shipping',
          carbonKg: 1.5,
          time: emailTime,
          cost
        });
      }
    }

    return activities;
  } catch (error) {
    console.error('Error scanning Gmail:', error);
    return [];
  }
}

// Helper to extract email body from Gmail payload
function getEmailBody(messageData) {
  let body = '';
  if (!messageData.payload) return body;
  
  if (messageData.payload.parts) {
    for (const part of messageData.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.parts) {
        for (const subPart of part.parts) {
          if (subPart.mimeType === 'text/plain' && subPart.body?.data) {
            body += Buffer.from(subPart.body.data, 'base64').toString('utf8');
          }
        }
      }
    }
  } else if (messageData.payload.body?.data) {
    body = Buffer.from(messageData.payload.body.data, 'base64').toString('utf8');
  }
  
  return body;
}

// Mock Activity generator for developers or users without full OAuth configuration
export function generateMockActivities(dateStr) {
  return [
    {
      id: `mock-1-${dateStr}`,
      type: 'calendar',
      title: 'Morning Gym Session',
      description: 'Travel from Home to Equinox Gym',
      origin: 'Home',
      destination: 'Equinox Gym',
      distanceKm: 4.2,
      durationMin: 12,
      mode: 'car',
      carbonKg: 0.8,
      time: `${dateStr}T07:30:00.000Z`,
      source: 'mock'
    },
    {
      id: `mock-2-${dateStr}`,
      type: 'calendar',
      title: 'Client Lunch Meeting',
      description: 'Travel from Equinox Gym to Blue Bottle Coffee',
      origin: 'Equinox Gym',
      destination: 'Blue Bottle Coffee',
      distanceKm: 6.8,
      durationMin: 18,
      mode: 'transit',
      carbonKg: 0.3,
      time: `${dateStr}T12:00:00.000Z`,
      source: 'mock'
    },
    {
      id: `mock-3-${dateStr}`,
      type: 'rideshare',
      title: 'Uber Ride Back Home',
      description: 'Ride receipt: Blue Bottle Coffee to Home ($18.50)',
      distanceKm: 8.5,
      mode: 'rideshare',
      carbonKg: 1.9,
      time: `${dateStr}T15:30:00.000Z`,
      cost: 18.50
    },
    {
      id: `mock-4-${dateStr}`,
      type: 'shopping',
      title: 'Amazon Order: Running Shoes',
      description: 'Retail purchase shipped via Priority Shipping',
      mode: 'priority_shipping',
      carbonKg: 4.5,
      time: `${dateStr}T11:45:00.000Z`,
      cost: 65.00
    },
    {
      id: `mock-5-${dateStr}`,
      type: 'diet',
      title: 'DoorDash: Gourmet Beef Burger',
      description: 'Dinner delivery from local burger shop (Beef Option)',
      mode: 'beef',
      carbonKg: 6.2,
      time: `${dateStr}T19:15:00.000Z`,
      cost: 22.50
    },
    {
      id: `mock-6-${dateStr}`,
      type: 'homeEnergy',
      title: 'Home Grid Electricity Baseline',
      description: 'Average daily household carbon footprint (standard grid)',
      mode: 'standard_grid',
      carbonKg: 2.5,
      time: `${dateStr}T00:00:00.000Z`
    }
  ];
}

// Aggregates scanning for today's footprint activities
export async function scanDayActivities(dateStr, forceMock = false) {
  const config = getConfig();
  const oauthClient = getOAuthClient(config);

  const homeEnergyBaseline = {
    id: `home-energy-${dateStr}`,
    type: 'homeEnergy',
    title: 'Home Grid Electricity Baseline',
    description: `Baseline emissions for standard household grid in ${config.homeLocation || 'San Francisco, CA'}`,
    mode: 'standard_grid',
    carbonKg: 2.5,
    time: `${dateStr}T00:00:00.000Z`
  };

  if (forceMock || !oauthClient || !config.googleTokens) {
    console.log('Using simulated/mock activities for scan.');
    const mockActivities = generateMockActivities(dateStr);
    const totalCarbon = mockActivities.reduce((acc, act) => acc + act.carbonKg, 0);
    return {
      activities: mockActivities,
      totalCarbonKg: Math.round(totalCarbon * 10) / 10,
      isMock: true
    };
  }

  try {
    // Authenticate client
    const auth = oauthClient;
    
    // Fetch Calendar and Gmail details concurrently
    const [calendarActivities, gmailActivities] = await Promise.all([
      scanCalendar(auth, dateStr, config),
      scanGmail(auth, dateStr)
    ]);

    const allActivities = [homeEnergyBaseline, ...calendarActivities, ...gmailActivities];
    const totalCarbon = allActivities.reduce((acc, act) => acc + act.carbonKg, 0);

    return {
      activities: allActivities,
      totalCarbonKg: Math.round(totalCarbon * 10) / 10,
      isMock: false
    };
  } catch (error) {
    console.error('Error during live API scan, returning mock fallback data:', error);
    const mockActivities = generateMockActivities(dateStr);
    const totalCarbon = mockActivities.reduce((acc, act) => acc + act.carbonKg, 0);
    return {
      activities: mockActivities,
      totalCarbonKg: Math.round(totalCarbon * 10) / 10,
      isMock: true,
      scanError: error.message
    };
  }
}
