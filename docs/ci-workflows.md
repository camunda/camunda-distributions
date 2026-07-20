---
title: CI/CD Workflows
---

# CI/CD Workflows

## Repository Structure

```
docker-compose/
  versions/
    camunda-8.4/ … camunda-8.10/   # Per-version compose configs
  test/
    e2e/                            # Shared Playwright tests (used by 8.4–8.7)

.github/
  actions/
    install-playwright/             # Composite: sets up Node 24 + Playwright (Chromium)
    generate-versions-matrix/       # Composite: detects changed versions → GHA matrix excludes
  config/
    renovatebot/                    # Renovate override configs
  workflows/
    docker-compose-test-e2e-template.yaml    # Reusable: spin up compose, run Playwright
    docker-compose-test-e2e-full-setup.yaml  # Caller: matrix across all versions
    docker-compose-release-template.yaml     # Reusable: package + publish one version
    docker-compose-release.yaml              # Caller: rolling release matrix
    renovatebot-config-check.yaml            # Validates Renovate config on PRs
```

## Workflows

### E2E Tests (`docker-compose-test-e2e-full-setup.yaml`)

Triggers on push to `main` or PR touching `docker-compose/versions/**`.

- **init job**: Runs `generate-versions-matrix` to build an exclude list of unchanged versions (skip-if-unchanged optimization).
- **exec job**: Fans out across all version matrix entries; passes compose args, e2e flag, and test directory to the reusable template.
- Each matrix entry specifies: `camunda-version`, `main-compose-args`, `e2e-test-enabled`, optional `e2e-test-directory`, `e2e-test-args`, `deps-compose-args`, and `timeout-minutes`.
- E2E tests default to `docker-compose/test/e2e`; versions 8.8+ use their own `docker-compose/versions/camunda-X.Y/tests/` (full-stack) and `tests-lightweight/` (lightweight, `@camunda/e2e-test-suite` c8Run suite).
- Matrix entries marked ⭐ are the primary configs per version (full-stack with e2e enabled).
- The 8.10 full-stack entry uses `deps-compose-args` to start `tests/docker-compose.elasticsearch-ci.yaml` before the main compose, since 8.10 no longer bundles Elasticsearch.

### E2E Test Template (`docker-compose-test-e2e-template.yaml`)

Reusable workflow called by the full-setup. Steps:
1. Checkout repo.
2. `install-playwright` composite action (Node 24, `npm ci`, `npx playwright install --with-deps chromium`).
3. Start Docker Compose dependencies (`deps-compose-args`, if set), then the main services.
4. Wait for health checks.
5. Run `npx playwright test` with configured args.
6. Upload HTML report as artifact (30-day retention).

Job timeout defaults to 30 minutes; matrix entries can raise it via `timeout-minutes` (the c8Run suite's connectors webhook spec waits 5 minutes synchronously, so lightweight entries use 45).

Playwright config: Chromium only in CI (`retries: 2`, `workers: 1`).

### Release (`docker-compose-release.yaml`)

Triggers on push to `main` touching `docker-compose/versions/**`, or manual `workflow_dispatch` with `release-all` flag.

- Rolling release model: each Camunda minor version has exactly one release artifact (no versioned tags).
- **init job**: Generates changed-versions matrix (or all versions if `release-all=true`).
- **exec job**: `max-parallel: 1` — releases versions sequentially in order (8.4 → 8.10).
- Uses HashiCorp Vault for Docker registry credentials (DockerHub + `registry.camunda.cloud`).

### `generate-versions-matrix` Action

Located in `.github/actions/generate-versions-matrix/`.

- Compares changed files against `docker-compose/versions/camunda-8.*` paths.
- Outputs `unchanged` (JSON array of matrix excludes) and `should-run` (bool).
- Used by both test and release workflows to skip unaffected versions on PRs.

## Renovate

Configured via `.github/renovate.json5` and per-component overrides in `.github/config/renovatebot/`.

- **Patch-only automation**: Minor and major version bumps are disabled — only patches are auto-merged.
- **Excluded versions**: 8.0, 8.1, 8.2 are excluded from all updates.
- **Semantic commits enforced**: `deps(docker-compose)` or `deps(github-actions)` scope.
- Docker image updates and GitHub Actions updates are managed separately.

## Conventions

- All secrets via HashiCorp Vault — no GitHub Secrets, no hardcoded values.
- Reusable workflows (`*-template.yaml`) are called via `uses:` with `secrets: inherit`.
- Artifact retention: 30 days for Playwright HTML reports.
- `cancel-in-progress: true` on all workflow concurrency groups.
