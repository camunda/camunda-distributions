import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type ComposeConfig = {
  services: Record<string, { environment?: Record<string, string> }>;
};

const composeDirectory = resolve(__dirname, '..');
const overrides = {
  HOST: 'example.test',
  IDENTITY_CLIENT_SECRET: 'identity-changed',
  KEYCLOAK_HOST: 'keycloak.example.test',
  ORCHESTRATION_CLIENT_SECRET: 'changed',
};
const expectations = {
  'docker-compose-full.yaml': {
    orchestration: {
      HOST: overrides.HOST,
      KEYCLOAK_HOST: overrides.KEYCLOAK_HOST,
      ORCHESTRATION_CLIENT_SECRET: overrides.ORCHESTRATION_CLIENT_SECRET,
    },
    connectors: { KEYCLOAK_HOST: overrides.KEYCLOAK_HOST },
    optimize: {
      HOST: overrides.HOST,
      KEYCLOAK_HOST: overrides.KEYCLOAK_HOST,
      SPRING_PROFILES_ACTIVE: 'ccsm',
    },
    identity: overrides,
    'web-modeler-restapi': {
      HOST: overrides.HOST,
      KEYCLOAK_HOST: overrides.KEYCLOAK_HOST,
    },
  },
  'docker-compose-web-modeler.yaml': {
    identity: overrides,
    'web-modeler-restapi': {
      HOST: overrides.HOST,
      KEYCLOAK_HOST: overrides.KEYCLOAK_HOST,
    },
  },
};

function renderCompose(composeFile: string, environment: NodeJS.ProcessEnv, envFile?: string): ComposeConfig {
  const args = ['compose'];
  if (envFile) {
    args.push('--env-file', envFile);
  }
  args.push('-f', composeFile, 'config', '--format', 'json');

  return JSON.parse(execFileSync('docker', args, {
    cwd: composeDirectory,
    encoding: 'utf8',
    env: environment,
  }));
}

function expectOverrides(config: ComposeConfig, composeFile: keyof typeof expectations): void {
  for (const [serviceName, expectedEnvironment] of Object.entries(expectations[composeFile])) {
    expect(config.services[serviceName]?.environment).toMatchObject(expectedEnvironment);
  }
}

test('shell environment overrides reach mounted Spring configuration', () => {
  const environment = { ...process.env, ...overrides };

  for (const composeFile of Object.keys(expectations) as Array<keyof typeof expectations>) {
    expectOverrides(renderCompose(composeFile, environment), composeFile);
  }
});

test('custom env-file overrides reach mounted Spring configuration', () => {
  const tempDirectory = mkdtempSync(join(tmpdir(), 'camunda-compose-env-'));
  const customEnvFile = join(tempDirectory, '.env');

  try {
    let customEnv = readFileSync(join(composeDirectory, '.env'), 'utf8');
    for (const [name, value] of Object.entries(overrides)) {
      customEnv = customEnv.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`);
    }
    writeFileSync(customEnvFile, customEnv);

    const environment = { ...process.env };
    for (const name of Object.keys(overrides)) {
      delete environment[name];
    }

    for (const composeFile of Object.keys(expectations) as Array<keyof typeof expectations>) {
      expectOverrides(renderCompose(composeFile, environment, customEnvFile), composeFile);
    }
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
});