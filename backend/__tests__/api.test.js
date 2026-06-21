import request from 'supertest';
import app from '../server.js';

// Mock db.js
jest.mock('../db.js', () => ({
  getConfig: jest.fn(() => ({
    geminiApiKey: 'mock-key',
    googleClientId: '',
    googleClientSecret: '',
    googleApiKey: '',
    googleRedirectUri: '',
    homeLocation: 'Mock City',
    wakeupTime: '08:00',
    firebaseConfig: {},
    googleTokens: null
  })),
  isUsingFirestore: jest.fn(() => false),
  saveConfig: jest.fn(),
  getFootprint: jest.fn(),
  saveFootprint: jest.fn(),
  getFootprintsHistory: jest.fn(),
  getChatHistory: jest.fn(),
  saveChatHistory: jest.fn(),
}));

describe('Backend API Tests', () => {
  it('GET /api/config should return obfuscated config', async () => {
    const res = await request(app).get('/api/config');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('geminiApiKey', '••••••••');
    expect(res.body).toHaveProperty('homeLocation', 'Mock City');
  });

  it('Should have rate limiting enabled', async () => {
    const res = await request(app).get('/api/config');
    expect(res.headers).toHaveProperty('x-ratelimit-limit');
  });
});
