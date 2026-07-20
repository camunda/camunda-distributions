---
title: E2E Testing
---

# E2E Testing

Playwright tests validate that each Docker Compose setup starts correctly and that the web UIs are accessible. Tests run in CI for every version on push to `main` or on PRs that touch `docker-compose/versions/**`.

## Test Layout

| Path | Used by versions | Purpose |
|------|-----------------|---------|
| `docker-compose/test/e2e/` | 8.7 | Shared tests: login flows for Operate, Tasklist |
| `docker-compose/versions/camunda-8.8/tests/` | 8.8 full-stack | Login flows for all full-stack apps plus `cross-component-happy-path.spec.ts` (deploy a process, complete a user task in Tasklist, verify completion in Operate), `connectors-flow.spec.ts` (outbound REST connector against Keycloak's discovery endpoint), `webhook-flow.spec.ts` (inbound webhook creates an instance), and `api-smoke.spec.ts` (REST v2 searches, connectors runtime health, negative auth checks) |
| `docker-compose/versions/camunda-8.9/tests/` | 8.9 full-stack | Same as 8.8 |
| `docker-compose/versions/camunda-8.10/tests/` | 8.10 full-stack, Web Modeler standalone | Same as 8.8 minus Console (no console service in 8.10); also holds `docker-compose.elasticsearch-ci.yaml` (throwaway ES for CI) |
| `docker-compose/versions/camunda-8.X/tests-lightweight/` | 8.8–8.10 lightweight | The `c8Run-8.X` project from the [`@camunda/e2e-test-suite`](https://www.npmjs.com/package/@camunda/e2e-test-suite) npm package: login, human-task flow, connectors, and API tests against the basic-auth lightweight stack |

Version-specific test directories are used when `e2e-test-directory` is specified in the CI matrix (see `.github/workflows/docker-compose-test-e2e-full-setup.yaml`).

### Lightweight suite notes

- The specs live inside the npm package (`node_modules/@camunda/e2e-test-suite/dist/tests/c8Run-8.X`); this repo only pins the package version and provides `playwright.config.ts` plus a checked-in `.env` with the stack's URLs.
- The package resolves BPMN fixtures relative to the working directory, so `postinstall` symlinks `resources -> node_modules/@camunda/e2e-test-suite/resources` (the symlink is gitignored).
- `zeebe-node` must stay an explicit devDependency: the package requires it at runtime but does not declare it as a dependency.
- The `.env` sets `PLAYWRIGHT_BASE_URL` per version (8.8 publishes the orchestration REST API on host port `8088`, 8.9/8.10 on `8080`) and `DATABASE` (`ES` for 8.8, `RDBMS` for 8.9/8.10) which some specs use to self-skip.

## Running Locally

```bash
# 1. Start the compose stack you want to test
cd docker-compose/versions/camunda-8.9
docker compose -f docker-compose-full.yaml up -d

# 2. Wait for services to be healthy
docker compose ps   # all services should show "healthy"

# 3. Run the version-specific tests
cd tests
npm ci
npx playwright install --with-deps chromium
npx playwright test

# Or run the shared tests
cd ../../../test/e2e
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

To test a lightweight stack with the shared cross-component suite:

```bash
cd docker-compose/versions/camunda-8.10
docker compose up -d --wait --wait-timeout 300

cd tests-lightweight
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

To test the 8.10 full stack locally, bring up the throwaway Elasticsearch first:

```bash
cd docker-compose/versions/camunda-8.10
docker compose -f tests/docker-compose.elasticsearch-ci.yaml up -d
docker compose -f docker-compose-full.yaml up -d --wait --wait-timeout 300
```

To run the focused Camunda 8.10 Keycloak and Web Modeler flow used in CI:

```bash
cd docker-compose/versions/camunda-8.10
docker compose -f docker-compose-web-modeler.yaml down -v --remove-orphans
docker compose -f docker-compose-web-modeler.yaml up -d --wait --wait-timeout 300

cd tests
npm ci
npx playwright install chrome
npx playwright test web_modeler_login.spec.ts
```

## CI Configuration

- **Browser**: Chromium only (Firefox and Safari are commented out to reduce CI time).
- **Retries**: 2 retries in CI, 0 locally.
- **Workers**: 1 (no parallel execution) in CI.
- **Reports**: HTML artifacts uploaded with 30-day retention.
- **Test gate**: Only versions with `e2e-test-enabled: true` in the matrix actually run Playwright. Others only validate that compose starts and becomes healthy.
- **Lightweight jobs (8.8–8.10)**: run the `c8Run-8.X` suite from `@camunda/e2e-test-suite` against `docker-compose.yaml` with a 45-minute timeout (the connectors webhook spec waits 5 minutes synchronously).
- **8.10 full-stack job**: brings up `tests/docker-compose.elasticsearch-ci.yaml` via the template's `deps-compose-args` before `docker-compose-full.yaml`, then runs every spec in `tests/` (`web_modeler_login.spec.ts` works there too — the hub service publishes host port `8070` in the full stack, same as the standalone setup).
- **Shared CI file changes** (the two e2e workflows or anything under `.github/actions/`) reset the changed-versions filter so the whole matrix runs, and the merge gate treats them as e2e-relevant — a CI-only PR cannot go green without executing tests.
- **8.10 Web Modeler standalone job**: runs `web_modeler_login.spec.ts`, covering Keycloak startup, Identity realm initialization, and the browser OIDC callback without requiring external Elasticsearch.

## Adding Tests for a New Version

1. Copy `tests/` from the nearest existing version into the new version directory.
2. Add a matrix entry in `.github/workflows/docker-compose-test-e2e-full-setup.yaml` with `e2e-test-enabled: true` and `e2e-test-directory: docker-compose/versions/camunda-X.Y/tests`.
3. Run locally against the new version to validate before pushing.
