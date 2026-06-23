import { jest } from '@jest/globals';

// Mock db.js using ES module mocking
jest.unstable_mockModule('../db.js', () => ({
  getConfig: () => ({
    geminiApiKey: 'mock-key',
    googleClientId: '',
    googleClientSecret: '',
    googleApiKey: '',
    googleRedirectUri: '',
    homeLocation: 'Mock City',
    wakeupTime: '08:00',
    firebaseConfig: {},
    googleTokens: null
  }),
  isUsingFirestore: () => false,
  saveConfig: () => {},
  getFootprint: () => {},
  saveFootprint: () => {},
  getFootprintsHistory: () => {},
  getChatHistory: () => {},
  saveChatHistory: () => {}
}));

// Dynamically import app and supertest after mocking
const { default: request } = await import('supertest');
const { default: app } = await import('../server.js');

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
