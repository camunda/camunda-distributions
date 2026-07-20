import { test, expect } from '@playwright/test';
import { BASE_URL, CONNECTORS_URL, KEYCLOAK_TOKEN_URL, getAccessToken } from './utils/api';

const SEARCH_ENDPOINTS = [
  '/v2/process-definitions/search',
  '/v2/process-instances/search',
  '/v2/element-instances/search',
  '/v2/variables/search',
  '/v2/incidents/search',
  '/v2/user-tasks/search',
];

test.describe('Orchestration REST API v2 smoke', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getAccessToken();
  });

  for (const endpoint of SEARCH_ENDPOINTS) {
    test(`search via ${endpoint}`, async () => {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const text = await response.text();
      expect(response.ok, `${endpoint} failed: ${response.status} ${text}`).toBe(true);
      expect(Array.isArray(JSON.parse(text).items)).toBe(true);
    });
  }

  test('connectors runtime is healthy', async () => {
    const response = await fetch(`${CONNECTORS_URL}/actuator/health`);
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe('UP');
  });

  test('connectors inbound endpoint is reachable', async () => {
    const response = await fetch(`${CONNECTORS_URL}/inbound`);
    expect(response.status).toBe(200);
  });

  test('request without token is rejected', async () => {
    const response = await fetch(`${BASE_URL}/v2/process-definitions/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(401);
  });

  test('token request with wrong client secret is rejected', async () => {
    const response = await fetch(KEYCLOAK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.ORCHESTRATION_CLIENT_ID ?? 'orchestration',
        client_secret: 'definitely-wrong-secret',
      }),
    });
    expect([400, 401]).toContain(response.status);
  });
});
