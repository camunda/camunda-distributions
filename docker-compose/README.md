# Camunda 8 Self-Managed - Docker Compose

A Docker Compose configuration to run Camunda Platform (e.g., Zeebe, Operate, Tasklist, Optimize, Identity, Connectors Bundle, and Web Modeler).

> [!CAUTION]
>
> Docker Compose is only recommended for local development.
> For production setups we recommend using [Camunda 8 SaaS](https://camunda.com/platform/), or [Camunda 8 Helm charts](https://docs.camunda.io/docs/self-managed/setup/install/).

## Supported Versions

Released Camunda versions:

- [Camunda 8.4](./versions/camunda-8.4)
- [Camunda 8.5](./versions/camunda-8.5)
- [Camunda 8.6](./versions/camunda-8.6)
- [Camunda 8.7](./versions/camunda-8.7)
- [Camunda 8.8](./versions/camunda-8.8)
- [Camunda 8.9](./versions/camunda-8.9)
- [Camunda 8.10](./versions/camunda-8.10)

Camunda `8.10` includes the same compose layouts as `8.9`, but Elasticsearch is no longer bundled and must be provided externally where needed.

## Continuous Integration

The basic functionality of Docker Compose is continually tested using GitHub Actions and Playwright.

## Continuous Delivery

TBA.
