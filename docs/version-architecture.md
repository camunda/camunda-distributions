---
title: Version Architecture
---

# Version Architecture

Each supported Camunda version lives in its own directory under `docker-compose/versions/camunda-X.Y/`. While the directory layout is consistent, there are meaningful differences in compose flavors and storage backends across versions.

## Compose Flavors by Version

| Version | `docker-compose.yaml` | `docker-compose-full.yaml` | `-web-modeler.yaml` | `-core.yaml` |
|---------|----------------------|----------------------------|---------------------|--------------|
| 8.4–8.7 | Full stack (includes Identity, Optimize, Web Modeler) | — | Standalone Web Modeler | Identity-disabled variant |
| 8.8–8.9 | Lightweight (Zeebe + Operate + Tasklist + Connectors, no Identity/Optimize) | Full stack | Standalone Web Modeler | — |
| 8.10+   | Lightweight (H2 default, no ES) | Full stack (requires external ES) | Standalone Web Modeler | — |

**Key shift at 8.8:** `docker-compose.yaml` became the lightweight setup. Use `docker-compose-full.yaml` for Identity, Optimize, and Web Modeler. The 8.8–8.9 full stack also includes Console.

## Elasticsearch Changes at 8.10

Elasticsearch is no longer bundled in any Docker Compose file for 8.10+.

- `docker-compose.yaml` defaults to H2 secondary storage (no ES dependency).
- `docker-compose-full.yaml` still supports ES but requires an external endpoint configured via `.env`:
  ```
  ELASTICSEARCH_URL=http://localhost:9200
  ELASTICSEARCH_HOST=localhost
  ELASTICSEARCH_PORT=9200
  ELASTICSEARCH_CLUSTER_NAME=elasticsearch
  ```

## Secondary Storage (8.10+)

The Orchestration container mounts `configuration/<file>.yaml` as its application config. Set `ORCHESTRATION_CONFIG_FILE` in `.env` to switch backends:

| Config file | Database | Drivers bundled |
|------------|----------|-----------------|
| `application-h2.yaml` | H2 (default, file-based) | Yes |
| `application-postgresql.yaml` | PostgreSQL | Yes |
| `application-mysql.yaml` | MySQL | No — drop `.jar` in `driver-lib/` |
| `application-mariadb.yaml` | MariaDB | No — drop `.jar` in `driver-lib/` |
| `application-mssql.yaml` | SQL Server | No — drop `.jar` in `driver-lib/` |
| `application-oracle.yaml` | Oracle | No — drop `.jar` in `driver-lib/` |

H2 data files are stored in `camunda-data/` (gitignored).

## Version Directory Layout

```
docker-compose/versions/camunda-X.Y/
  docker-compose.yaml              # Primary compose file
  docker-compose-full.yaml         # Full stack (8.8+)
  docker-compose-web-modeler.yaml  # Web Modeler standalone
  .env                             # Image versions + runtime config (template, not for real secrets)
  connector-secrets.txt            # Connector environment variables
  configuration/                   # Selectable Orchestration application files (8.9+)
  driver-lib/                      # Drop vendor JDBC jars here (gitignored content)
  camunda-data/                    # Runtime H2 data (gitignored)
  tests/                           # Version-specific Playwright tests (8.8+)
  .orchestration/application.yaml  # Full-stack Orchestration config
  .connectors/application.yaml     # Full-stack Connectors config
  .identity/application.yaml       # Identity/Keycloak config
  .console/application.yaml        # Console config (8.8–8.9)
  .optimize/environment-config.yaml # Optimize native config
  .optimize/application-ccsm.yaml  # Optimize Identity config (8.10+)
  .web-modeler/application.yaml    # Shared Hub config (8.10+)
  .web-modeler/application-full.yaml # Full-stack Hub clusters (8.10+)
```

## Application Configuration at 8.10

- The lightweight setup remains compact: Connectors application YAML is inline under the top-level Compose `configs`, while Orchestration mounts the selected file from `configuration/`.
- The full stack mounts the component files under `.orchestration/`, `.connectors/`, `.identity/`, `.optimize/`, and `.web-modeler/`.
- Full and standalone Hub share `.web-modeler/application.yaml`. The full-stack `application-full.yaml` imports it and adds cluster registrations.
- Standalone Web Modeler remains one Compose entry point. Its small standalone-only Identity client overlay is inline in `docker-compose-web-modeler.yaml` and imported by `.identity/application.yaml`.
- `.env` provides runtime values and development secrets. Spring environment variables remain available as overrides, while PostgreSQL, Keycloak, Hub WebSockets, and other native services keep their environment-based configuration.

## Authentication

The full-stack setup uses Keycloak for OIDC. Keycloak runs on port `18080`, using `host.docker.internal` for internal service-to-service communication. Default credentials are in `.env` — do not commit real secrets there.

## Port Reference

| Port  | Service          |
|-------|------------------|
| 8080  | Orchestration REST API |
| 26500 | Orchestration gRPC |
| 9600  | Management/actuator |
| 8086  | Connectors |
| 18080 | Keycloak |
| 5432  | PostgreSQL (when used) |
