# Camunda 8 Self-Managed - Docker Compose

## Usage

For end user usage, please check the official documentation of [Camunda 8 Self-Managed Docker Compose](https://docs.camunda.io/docs/next/self-managed/quickstart/developer-quickstart/docker-compose/).

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

Feel free to copy these files and adjust the JDBC URL/credentials for your environment. Example:

```bash
cd docker-compose/versions/camunda-8.10
export ORCHESTRATION_CONFIG_FILE=application-mysql.yaml
docker compose up -d
```

### JDBC drivers

The Camunda Docker image automatically loads any `.jar` dropped into `/driver-lib`. A writable `driver-lib/` folder is included next to the compose file so you can copy the vendor JDBC driver there before starting (e.g., `driver-lib/mysql-connector-j-9.0.0.jar`). This is required for MySQL/MariaDB, SQL Server, and Oracle. PostgreSQL and H2 drivers are already bundled.
