import { expect } from '@playwright/test';
import * as fs from 'fs';

export const BASE_URL = 'http://localhost:8080';
export const CONNECTORS_URL = 'http://localhost:8086';
export const KEYCLOAK_TOKEN_URL =
  'http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token';
const CLIENT_ID = process.env.ORCHESTRATION_CLIENT_ID ?? 'orchestration';
const CLIENT_SECRET = process.env.ORCHESTRATION_CLIENT_SECRET ?? 'secret';

export async function getAccessToken(): Promise<string> {
  const response = await fetch(KEYCLOAK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  expect(response.ok, `token request failed: ${response.status}`).toBe(true);
  const body = await response.json();
  return body.access_token;
}

export async function deployProcess(
  token: string,
  bpmnPath: string,
  fileName: string,
  transform?: (bpmn: string) => string,
): Promise<void> {
  let bpmn = fs.readFileSync(bpmnPath, 'utf-8');
  if (transform) bpmn = transform(bpmn);
  const form = new FormData();
  form.append(
    'resources',
    new Blob([bpmn], { type: 'application/xml' }),
    fileName,
  );
  const response = await fetch(`${BASE_URL}/v2/deployments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await response.text();
  expect(response.ok, `deployment failed: ${response.status} ${text}`).toBe(true);
}

export async function startProcessInstance(token: string, processDefinitionId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/v2/process-instances`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ processDefinitionId }),
  });
  const text = await response.text();
  expect(response.ok, `start instance failed: ${response.status} ${text}`).toBe(true);
  return String(JSON.parse(text).processInstanceKey);
}

export async function waitForInstanceCompleted(token: string, instanceKey: string, timeout = 60000): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await fetch(`${BASE_URL}/v2/process-instances/${instanceKey}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return `http-${response.status}`;
        const body = await response.json();
        return body.state;
      },
      { timeout, intervals: [2000] },
    )
    .toBe('COMPLETED');
}
