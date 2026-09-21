/// <reference types="node" />

import { test, expect } from '@playwright/test';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  BASE_URL,
  getAccessToken,
  deployProcess,
  startProcessInstance,
  waitForInstanceCompleted,
} from './utils/api';

const COMPOSE_DIRECTORY = path.resolve(__dirname, '..');
const BPMN_PATH = path.resolve(__dirname, 'resources', 'centralized_secrets.bpmn');

type ActivatedJob = {
  jobKey: string;
  variables: { secretValue: string };
};

async function post(token: string, endpoint: string, body: object) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  expect(response.ok, `${endpoint} failed: ${response.status}`).toBe(true);
  return response.status === 204 ? undefined : response.json();
}

function composeOutput(composeFile: string, args: string[]): string {
  try {
    return execFileSync('docker', ['compose', '-f', composeFile, ...args], {
      cwd: COMPOSE_DIRECTORY,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch {
    throw new Error(`Could not read Compose ${args[0]} for ${composeFile}`);
  }
}

test.use({ trace: 'off' });

test('centralized secret reaches only the worker, not stored data, Operate, config, or logs', async ({ page }) => {
  test.setTimeout(180000);

  const startedAt = Date.now();
  const token = await getAccessToken();
  const runId = randomUUID();
  const processId = `centralized_secrets_${runId}`;
  const secretName = `COMPOSE_E2E_${runId}`;
  const secretValue = `compose-test-${randomUUID()}`;
  const reference = `camunda.secrets.${secretName}`;
  const secretFile = path.join(COMPOSE_DIRECTORY, 'secrets', secretName);
  let instanceKey: string | undefined;
  let completed = false;

  fs.writeFileSync(secretFile, secretValue, { encoding: 'utf8', flag: 'wx', mode: 0o644 });
  try {
    for (const composeFile of ['docker-compose.yaml', 'docker-compose-full.yaml']) {
      const output = composeOutput(composeFile, ['config', '--format', 'json']);
      expect(output.includes(secretValue), 'Compose output excludes the file value').toBe(false);
      const config = JSON.parse(output);
      expect(config.services.orchestration.environment.CAMUNDA_SECRETS_STORES_FILE_DEFAULT_PATH)
        .toBe('/etc/camunda/secrets');
      expect(config.services.orchestration.volumes).toContainEqual(expect.objectContaining({
        type: 'bind',
        source: path.join(COMPOSE_DIRECTORY, 'secrets'),
        target: '/etc/camunda/secrets',
        read_only: true,
      }));
      const mountedServices = Object.entries(config.services)
        .filter(([, service]: [string, any]) => service.volumes?.some(
          (volume: { source: string }) => volume.source === path.join(COMPOSE_DIRECTORY, 'secrets'),
        ))
        .map(([service]) => service);
      expect(mountedServices).toEqual(['orchestration']);
    }

    await deployProcess(token, BPMN_PATH, 'centralized_secrets.bpmn', (bpmn) =>
      bpmn.replaceAll('centralized_secrets_process', processId)
        .replaceAll('COMPOSE_E2E_SECRET', secretName),
    );
    instanceKey = await startProcessInstance(token, processId);

    let jobs: ActivatedJob[] = [];
    await expect.poll(async () => {
      const response = await post(token, '/v2/jobs/activation', {
        type: processId,
        worker: 'compose-secrets-test',
        timeout: 180000,
        maxJobsToActivate: 1,
        requestTimeout: 5000,
      });
      jobs = response.jobs;
      return jobs.length;
    }, { timeout: 60000, intervals: [1000] }).toBe(1);

    expect(jobs[0].variables.secretValue === secretValue, 'worker receives the file value').toBe(true);

    await expect.poll(async () => {
      const variables = await post(token, '/v2/variables/search', {
        filter: { processInstanceKey: instanceKey, name: 'secretValue' },
      });
      expect(JSON.stringify(variables).includes(secretValue), 'stored variables exclude the value').toBe(false);
      return variables.items.some((variable: { value: string; isTruncated: boolean }) =>
        variable.value === JSON.stringify(reference) && !variable.isTruncated,
      );
    }, { timeout: 30000, intervals: [1000] }).toBe(true);

    await page.addLocatorHandler(
      page.getByRole('dialog').filter({ hasText: /what moved in Operate/ }),
      async (dialog) => { await dialog.getByRole('button', { name: 'Close', exact: true }).click(); },
    );
    await page.goto(`${BASE_URL}/operate/processes/${instanceKey}`);
    await page.locator('input[name="username"], input[name="email"], input[id="username"]').first().fill('demo');
    await page.locator('input[type="password"]').fill('demo');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/operate\/processes\//);
    await page.locator('[data-element-id="SecretTask"]').click();
    await page.getByText('Variables', { exact: true }).click();
    await expect.poll(async () => {
      const text = await page.locator('body').innerText();
      expect(text.includes(secretValue), 'Operate excludes the file value').toBe(false);
      return text.includes('secretValue') && text.includes(reference);
    }, { timeout: 30000, intervals: [1000] }).toBe(true);

    await post(token, `/v2/jobs/${jobs[0].jobKey}/completion`, { variables: {} });
    await waitForInstanceCompleted(token, instanceKey);
    completed = true;

    await expect.poll(async () => {
      const response = await fetch('http://localhost:9200/zeebe-record*/_search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: 10000,
          track_total_hits: true,
          query: { range: { timestamp: { gte: startedAt } } },
        }),
      });
      expect(response.ok, `exported record search failed: ${response.status}`).toBe(true);
      const result = await response.json();
      expect(result.hits.total.relation, 'record count is exact').toBe('eq');
      expect(result.hits.hits.length, 'all matching records were inspected').toBe(result.hits.total.value);
      expect(JSON.stringify(result).includes(secretValue), 'exported records exclude the value').toBe(false);
      const records = result.hits.hits.map((hit: { _source: any }) => hit._source)
        .filter((record: any) => record.value.bpmnProcessId === processId);
      return records.some((record: any) => record.intent === 'ELEMENT_COMPLETED'
        && record.value.bpmnElementType === 'PROCESS')
        && records.some((record: any) => record.valueType === 'VARIABLE'
          && record.value.name === 'secretValue' && record.value.value === JSON.stringify(reference));
    }, { timeout: 60000, intervals: [1000] }).toBe(true);

    for (const service of ['orchestration', 'connectors']) {
      const logs = composeOutput('docker-compose-full.yaml', ['logs', '--no-color', service]);
      expect(logs.trim().length, `${service} logs were collected`).toBeGreaterThan(0);
      expect(logs.includes(secretValue), `${service} logs exclude the file value`).toBe(false);
    }
  } finally {
    fs.unlinkSync(secretFile);
    if (instanceKey && !completed) {
      await post(token, `/v2/process-instances/${instanceKey}/cancellation`, {});
    }
  }
});

test('missing centralized secret blocks activation and creates an incident', async () => {
  const token = await getAccessToken();
  const runId = randomUUID();
  const processId = `centralized_secrets_missing_${runId}`;
  await deployProcess(token, BPMN_PATH, 'centralized_secrets.bpmn', (bpmn) =>
    bpmn.replaceAll('centralized_secrets_process', processId)
      .replaceAll('COMPOSE_E2E_SECRET', `COMPOSE_E2E_MISSING_${runId}`),
  );
  const instanceKey = await startProcessInstance(token, processId);
  try {
    await expect.poll(async () => {
      const activation = await post(token, '/v2/jobs/activation', {
        type: processId,
        worker: 'compose-secrets-test',
        timeout: 30000,
        maxJobsToActivate: 1,
        requestTimeout: 1000,
      });
      expect(activation.jobs).toHaveLength(0);
      const incidents = await post(token, `/v2/process-instances/${instanceKey}/incidents/search`, {});
      return incidents.items.some((incident: { errorType: string; state: string }) =>
        incident.errorType === 'SECRET_RESOLUTION_ERROR' && incident.state === 'ACTIVE',
      );
    }, { timeout: 60000, intervals: [1000] }).toBe(true);
  } finally {
    await post(token, `/v2/process-instances/${instanceKey}/cancellation`, {});
  }
});
