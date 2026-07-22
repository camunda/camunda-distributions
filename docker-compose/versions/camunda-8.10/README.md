# Camunda 8 Self-Managed - Docker Compose

## Usage

For end user usage, please check the official documentation of [Camunda 8 Self-Managed Docker Compose](https://docs.camunda.io/docs/next/self-managed/quickstart/developer-quickstart/docker-compose/).

## Application configuration

Camunda services read their application settings from YAML mounted by Docker Compose:

- The lightweight `docker-compose.yaml` keeps its Connectors YAML inline under `configs`, preserving the compact setup. Orchestration mounts the selected file from `configuration/`.
- The full and standalone setups share component files under `.identity/` and `.web-modeler/`. The standalone-only Identity overlay remains inline in `docker-compose-web-modeler.yaml`.
- The full setup additionally uses `.orchestration/application.yaml`, `.connectors/application.yaml`, and the files under `.optimize/`. Hub cluster registrations are isolated in `.web-modeler/application-full.yaml`.

The mounted files reference runtime values from `.env` with `${VARIABLE:default}` placeholders. Keep environment-specific endpoints and secrets in `.env`; direct Spring environment variables can still override file values. Hub database and Pusher credentials remain direct environment variables, matching the Helm deployment. PostgreSQL, Keycloak, Hub WebSockets, and other non-Spring services continue to use their native environment-based configuration.

## Elasticsearch

Camunda `8.10` no longer bundles Elasticsearch in Docker Compose.

- `docker-compose.yaml` uses the default H2 secondary storage and does not start Elasticsearch.
- `docker-compose-full.yaml` is still available, but it expects an external Elasticsearch endpoint.
- Configure that endpoint with `ELASTICSEARCH_URL`, `ELASTICSEARCH_HOST`, `ELASTICSEARCH_PORT`, and `ELASTICSEARCH_CLUSTER_NAME` in `.env`.

Example:

```bash
cd docker-compose/versions/camunda-8.10
docker compose -f docker-compose-full.yaml up -d
```

## Switching secondary storage databases

The Orchestration container now mounts `configuration/<file>.yaml` into `/usr/local/camunda/config/application.yaml`.  
Set `ORCHESTRATION_CONFIG_FILE` in `.env` (or export it before running `docker compose`) to one of the provided samples:

- `application-h2.yaml` (default, file-based H2)
- `application-mysql.yaml`
- `application-mariadb.yaml`
- `application-postgresql.yaml`
- `application-mssql.yaml`
- `application-oracle.yaml`
- `application-opensearch.yaml`

Feel free to copy these files and adjust the JDBC URL/credentials for your environment. Example:

```bash
cd docker-compose/versions/camunda-8.10
export ORCHESTRATION_CONFIG_FILE=application-mysql.yaml
docker compose up -d
```

The `application-opensearch.yaml` sample expects an OpenSearch instance reachable at `http://opensearch:9200`. OpenSearch is not bundled, so either point the URL at an existing instance or add one via a `docker-compose.override.yaml` on the same network — see [configure secondary storage with Docker Compose](https://docs.camunda.io/docs/self-managed/quickstart/developer-quickstart/docker-compose/secondary-storage/) for a ready-made example.

### JDBC drivers

The Camunda Docker image automatically loads any `.jar` dropped into `/driver-lib`. A writable `driver-lib/` folder is included next to the compose file so you can copy the vendor JDBC driver there before starting (e.g., `driver-lib/mysql-connector-j-9.0.0.jar`). This is required for MySQL/MariaDB, SQL Server, and Oracle. PostgreSQL and H2 drivers are already bundled.

## Enabling multi-tenancy

### Lightweight configuration

The lightweight `docker-compose.yaml` runs with basic authentication and an unprotected API. To enable multi-tenancy, protect the API and switch on the tenancy checks by creating a `docker-compose.override.yaml` next to the compose file:

```yaml
services:
  orchestration:
    environment:
      - CAMUNDA_SECURITY_AUTHENTICATION_UNPROTECTEDAPI=false
      - CAMUNDA_SECURITY_MULTITENANCY_CHECKSENABLED=true
      - CAMUNDA_SECURITY_MULTITENANCY_APIENABLED=true
  connectors:
    environment:
      - CAMUNDA_CLIENT_AUTH_METHOD=basic
      - CAMUNDA_CLIENT_AUTH_USERNAME=demo
      - CAMUNDA_CLIENT_AUTH_PASSWORD=demo
```

Then start the stack with `docker compose up -d` and manage tenants through the Orchestration Cluster API (or the Orchestration Cluster Admin UI at `http://localhost:8080/admin`):

```bash
# create a tenant
curl -u demo:demo -X POST http://localhost:8080/v2/tenants \
  -H 'Content-Type: application/json' -d '{"tenantId": "tenant-a", "name": "Tenant A"}'
# assign the demo user to it
curl -u demo:demo -X PUT http://localhost:8080/v2/tenants/tenant-a/users/demo
```

API clients must authenticate with basic auth once the API is protected (`camunda.client.auth.method=basic` plus username and password in the Camunda client SDKs).

### Full configuration

The full `docker-compose-full.yaml` already protects the API through Keycloak, so only the tenancy checks need to be switched on. Add the following to `.env`:

```bash
CAMUNDA_SECURITY_MULTITENANCY_CHECKSENABLED=true
CAMUNDA_SECURITY_MULTITENANCY_APIENABLED=true
```

Then start the stack with `docker compose -f docker-compose-full.yaml up -d` and manage tenants through the Orchestration Cluster API with an OAuth token (or the Orchestration Cluster Admin UI at `http://localhost:8080/admin`):

```bash
TOKEN=$(curl -s -X POST 'http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token' \
  -d 'grant_type=client_credentials' -d 'client_id=orchestration' -d 'client_secret=secret' | jq -r .access_token)
# create a tenant
curl -X POST http://localhost:8080/v2/tenants -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"tenantId": "tenant-a", "name": "Tenant A"}'
# assign the demo user to it
curl -X PUT http://localhost:8080/v2/tenants/tenant-a/users/demo -H "Authorization: Bearer $TOKEN"
```
