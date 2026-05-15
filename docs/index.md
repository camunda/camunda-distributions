---
title: Overview
---

# Camunda Distributions — Developer Docs

This repository contains the official Camunda 8 Self-Managed distributions for Docker Compose. It is a development and testing repository — end users should use the [official documentation](https://docs.camunda.io/docs/self-managed/about-self-managed/).

## Topics

| Page | Description |
|------|-------------|
| [Commands](./commands.md) | Docker Compose and E2E test commands |
| [Version Architecture](./version-architecture.md) | Per-version compose flavors, storage backends, and key changes |
| [E2E Testing](./e2e-testing.md) | Playwright test layout, running locally, CI matrix |
| [CI/CD Workflows](./ci-workflows.md) | Workflow architecture, release model, Renovate config |

## Repository Purpose

- Provide Docker Compose setups for local development across all actively supported Camunda 8 minor versions (currently 8.4–8.10).
- Validate those setups with Playwright E2E tests in CI.
- Publish rolling releases (one artifact per minor version) to the Camunda registry on every merge to `main`.

## Key Directories

| Path | Description |
|------|-------------|
| `docker-compose/versions/camunda-X.Y/` | Version-specific compose files, env, and config |
| `docker-compose/test/e2e/` | Shared Playwright tests (8.4–8.7 and earlier 8.8 variants) |
| `.github/workflows/` | CI/CD: E2E tests + rolling release |
| `.github/actions/` | Composite actions: Playwright setup, matrix generation |
