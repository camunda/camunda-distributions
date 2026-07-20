import { test, expect } from '@playwright/test';
import * as path from 'path';
import {
  BASE_URL,
  getAccessToken,
  deployProcess,
  startProcessInstance,
  waitForInstanceCompleted,
} from './utils/api';

const PROCESS_ID = 'rest_connector_process';

test('outbound REST connector flow: deploy, execute against Keycloak, verify result variable', async () => {
  test.setTimeout(180000);

  const token = await getAccessToken();
  await deployProcess(
    token,
    path.resolve(__dirname, 'resources', 'rest_connector_process.bpmn'),
    'rest_connector_process.bpmn',
  );
  const instanceKey = await startProcessInstance(token, PROCESS_ID);

  // The connectors runtime picks up the job and calls Keycloak's OIDC discovery endpoint
  await waitForInstanceCompleted(token, instanceKey, 120000);

  const response = await fetch(`${BASE_URL}/v2/variables/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: { processInstanceKey: instanceKey, name: 'issuer' } }),
  });
  const text = await response.text();
  expect(response.ok, `variables search failed: ${response.status} ${text}`).toBe(true);
  const items = JSON.parse(text).items;
  expect(items.length, 'issuer variable not found on instance').toBeGreaterThan(0);
  expect(items[0].value).toContain('camunda-platform');
});
