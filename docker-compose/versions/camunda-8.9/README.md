# Camunda 8 Self-Managed - Docker Compose

## Usage

For end user usage, please check the offical documentation of [Camunda 8 Self-Managed Docker Compose](https://docs.camunda.io/docs/next/self-managed/quickstart/developer-quickstart/docker-compose/).

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

Then start the stack with `docker compose up -d` and manage tenants through the Orchestration Cluster API (or the Identity UI at `http://localhost:8080/identity`):

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

Then start the stack with `docker compose -f docker-compose-full.yaml up -d` and manage tenants through the Orchestration Cluster API with an OAuth token (or the Identity UI at `http://localhost:8080/identity`):

```bash
TOKEN=$(curl -s -X POST 'http://localhost:18080/auth/realms/camunda-platform/protocol/openid-connect/token' \
  -d 'grant_type=client_credentials' -d 'client_id=orchestration' -d 'client_secret=secret' | jq -r .access_token)
# create a tenant
curl -X POST http://localhost:8080/v2/tenants -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"tenantId": "tenant-a", "name": "Tenant A"}'
# assign the demo user to it
curl -X PUT http://localhost:8080/v2/tenants/tenant-a/users/demo -H "Authorization: Bearer $TOKEN"
```
