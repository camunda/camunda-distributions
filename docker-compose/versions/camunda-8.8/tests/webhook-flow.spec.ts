import { test, expect } from '@playwright/test';
import * as path from 'path';
import { BASE_URL, CONNECTORS_URL, getAccessToken, deployProcess } from './utils/api';

const PROCESS_ID = 'webhook_start_process';
const WEBHOOK_URL = `${CONNECTORS_URL}/inbound/distro-webhook`;

test('inbound webhook connector flow: deploy, trigger webhook, verify instance created', async () => {
  test.setTimeout(180000);

  const token = await getAccessToken();
  await deployProcess(
    token,
    path.resolve(__dirname, 'resources', 'webhook_start_process.bpmn'),
    'webhook_start_process.bpmn',
  );

  // The connectors runtime registers the webhook asynchronously after deployment
  await expect
    .poll(
      async () => {
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'e2e' }),
        });
        return response.status;
      },
      { timeout: 120000, intervals: [3000] },
    )
    .toBeLessThan(300);

  // The triggered instance runs straight to the end event
  await expect
    .poll(
      async () => {
        const response = await fetch(`${BASE_URL}/v2/process-instances/search`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: { processDefinitionId: PROCESS_ID, state: 'COMPLETED' },
          }),
        });
        if (!response.ok) return 0;
        return (await response.json()).items.length;
      },
      { timeout: 60000, intervals: [2000] },
    )
    .toBeGreaterThan(0);
});
