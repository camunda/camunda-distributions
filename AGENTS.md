# Agent Instructions

You are working on the **Camunda 8 Self-Managed Distributions** repository. It hosts Docker Compose configurations for all actively supported Camunda 8 releases (8.4–8.10), along with Playwright E2E tests and CI/CD automation.

Use this file as the practical guide. For CI/CD and workflow architecture, also read `.github/AGENTS.md`.

## Critical Rules

- NEVER assume Docker Compose configs are identical across versions — always check the target version directory first.
- NEVER edit `.env` files to add real credentials — they are templates; use environment variable exports for local testing.
- ALWAYS open a GitHub issue before submitting a PR (required by contributing guidelines).
- ALWAYS use Conventional Commits for PR titles and commit messages.
- NEVER create a PR that touches multiple Camunda versions unless the change is truly cross-cutting (e.g., a shared workflow fix).

## Quick Start

- Identify the target Camunda version before editing (`docker-compose/versions/camunda-X.Y/`).
- Keep changes version-scoped; the release workflow handles each version independently.
- Read `STATE.md` at repo root if it exists (session continuity file, gitignored).

## Docker Compose Commands

```bash
# Start a version (lightweight: Zeebe + Operate + Tasklist + Connectors, H2 storage)
cd docker-compose/versions/camunda-8.10
docker compose -f docker-compose.yaml up -d

# Start with full stack (Optimize, Identity/Keycloak, Web Modeler, Console)
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

## E2E Test Commands

```bash
# From the shared test directory
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

## Version Architecture

See `docs/version-architecture.md` for a detailed breakdown. Key differences:

| Versions  | Compose flavors                  | ES bundled | Secondary storage |
|-----------|----------------------------------|------------|-------------------|
| 8.4–8.7   | `docker-compose.yaml`, `-core`, `-web-modeler` | Yes | Elasticsearch |
| 8.8–8.9   | `docker-compose.yaml`, `-full`, `-web-modeler` | Yes | Elasticsearch |
| 8.10+     | `docker-compose.yaml`, `-full`, `-web-modeler` | **No** | H2 (default), external DB |

- **8.8+**: `docker-compose.yaml` is the lightweight setup (no Identity/Optimize/Web Modeler). `-full` is the complete stack.
- **8.10+**: Elasticsearch is no longer bundled. `docker-compose-full.yaml` expects an external ES endpoint via `.env`.

## State File

Use `STATE.md` (repo root, gitignored) to persist session context across conversations.

**On session start:** Read `STATE.md` if it exists.

**During work:** Update whenever you complete a task, make a key decision, or discover something important.

**Format:**

```markdown
## Goal
One-line summary of what we are working on.

## Instructions
Constraints or standing orders from the user that apply across sessions.

## Discoveries
Key findings, gotchas, and decisions made during investigation.

## Accomplished
Numbered list of completed items.

## Not Yet Done
Numbered list of remaining items, in priority order.

## Relevant Files
Files central to the current task, with brief annotations.
```

## Commit and Branch Conventions

- Branches: `issueId-description` (e.g., `423-fix-8-10-postgres-config`)
- Commit/PR titles: Conventional Commits format
- Common types: `feat`, `fix`, `docs`, `ci`, `deps`, `chore`
- Scope: `docker-compose` for compose file changes, `github-actions` for workflow changes
- Examples:
  - `fix(docker-compose): correct connector secret key for 8.10`
  - `deps(docker-compose): update camunda/operate docker tag to v8.10.1`
  - `ci: add matrix entry for 8.10 full-setup e2e`
- **NEVER create merge commits.** Use `git rebase origin/main` to update branches.

## Additional Agent Context

- `CLAUDE.md` — thin redirect for Claude Code (points to this file)
- `.github/AGENTS.md` — CI/CD workflow architecture, release model, matrix generation
- `docs/index.md` — repository overview and purpose
- `docs/version-architecture.md` — per-version compose flavors, storage backends, key changes
- `docs/e2e-testing.md` — E2E test layout, how to run locally, CI test matrix
- `STATE.md` — session continuity (gitignored, read on session start)
