# Camunda 8 Self-Managed - Docker Compose

## Usage

For end user usage, please check the offical documentation of [Camunda 8 Self-Managed Docker Compose](https://docs.camunda.io/docs/self-managed/setup/deploy/local/docker-compose/).

## Enabling multi-tenancy

Multi-tenancy requires Zeebe to authenticate through Identity. Set the following in `.env`:

```bash
ZEEBE_AUTHENTICATION_MODE=identity
MULTI_TENANCY_ENABLED=true
```

Then start the stack with `docker compose up -d` and manage tenants in the Identity UI at `http://localhost:8084` (log in as `demo`/`demo`), or through the Identity API:

```bash
# create a tenant (token from the camunda-identity client, e.g. via password grant for the demo user)
curl -X POST http://localhost:8084/api/tenants -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"tenantId": "tenant-a", "name": "Tenant A"}'
```

API clients must use OAuth client credentials (e.g. the `zeebe` client from `.env`) once authentication is enabled.
