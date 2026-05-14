---
title: Commands
---

# Commands

## Docker Compose

```bash
# Start lightweight setup (Zeebe + Operate + Tasklist + Connectors, H2 storage)
cd docker-compose/versions/camunda-8.10
docker compose -f docker-compose.yaml up -d

# Start full stack (Optimize, Identity/Keycloak, Web Modeler, Console)
docker compose -f docker-compose-full.yaml up -d

# Start Web Modeler standalone
docker compose -f docker-compose-web-modeler.yaml up -d

# View logs for a specific service
docker compose logs orchestration -f

# Tear down
docker compose down

# Tear down including volumes
docker compose down -v
```

### Switching Secondary Storage (8.10+)

```bash
# Set config file before starting (H2 is default)
export ORCHESTRATION_CONFIG_FILE=application-postgresql.yaml
docker compose up -d

# Available configs in configuration/:
# application-h2.yaml (default)
# application-mysql.yaml
# application-mariadb.yaml
# application-postgresql.yaml
# application-mssql.yaml
# application-oracle.yaml
```

For MySQL/MariaDB/MSSQL/Oracle, copy the vendor JDBC `.jar` into `driver-lib/` before starting. PostgreSQL and H2 drivers are bundled.

## E2E Tests

```bash
# From the shared test directory (8.4–8.7)
cd docker-compose/test/e2e
npm ci
npx playwright install --with-deps chromium

# Run all tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Debug a specific test
npx playwright test --debug

# View HTML report after a run
npx playwright show-report
```

Version-specific tests live in `docker-compose/versions/camunda-X.Y/tests/` and use the same commands.
