---
title: E2E Testing
---

# E2E Testing

Playwright tests validate that each Docker Compose setup starts correctly and that the web UIs are accessible. Tests run in CI for every version on push to `main` or on PRs that touch `docker-compose/versions/**`.

## Test Layout

| Path | Used by versions | Purpose |
|------|-----------------|---------|
| `docker-compose/test/e2e/` | 8.4–8.7 (and 8.8–8.9 lightweight) | Shared tests: login flows for Operate, Tasklist |
| `docker-compose/versions/camunda-8.8/tests/` | 8.8 full-stack | Full-stack tests including Optimize, Web Modeler, Console |
| `docker-compose/versions/camunda-8.9/tests/` | 8.9 full-stack | Same as 8.8 |
| `docker-compose/versions/camunda-8.10/tests/` | 8.10 | Version-specific login tests; CI runs the Web Modeler test against the standalone setup |

Version-specific test directories are used when `e2e-test-directory` is specified in the CI matrix (see `.github/workflows/docker-compose-test-e2e-full-setup.yaml`).

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
- **8.10 coverage**: The standalone Web Modeler job runs `web_modeler_login.spec.ts`, covering Keycloak startup, Identity realm initialization, and the browser OIDC callback without requiring external Elasticsearch.

## Adding Tests for a New Version

1. Copy `tests/` from the nearest existing version into the new version directory.
2. Add a matrix entry in `.github/workflows/docker-compose-test-e2e-full-setup.yaml` with `e2e-test-enabled: true` and `e2e-test-directory: docker-compose/versions/camunda-X.Y/tests`.
3. Run locally against the new version to validate before pushing.
