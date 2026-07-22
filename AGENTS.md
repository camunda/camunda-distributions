# Agent Instructions

You are working on the **Camunda 8 Self-Managed Distributions** repository. It hosts Docker Compose configurations for all actively supported Camunda 8 releases (8.4–8.10), along with Playwright E2E tests and CI/CD automation.

## Critical Rules

- NEVER assume Docker Compose configs are identical across versions — always check the target version directory first.
- NEVER edit `.env` files to add real credentials — they are templates; use environment variable exports for local testing.
- ALWAYS open a GitHub issue before submitting a PR (required by contributing guidelines).
- ALWAYS use Conventional Commits for PR titles and commit messages.
- NEVER create a PR that touches multiple Camunda versions unless the change is truly cross-cutting (e.g., a shared workflow fix).
- NEVER create merge commits. Use `git rebase origin/main` to update branches.

## Quick Start

- Identify the target Camunda version before editing (`docker-compose/versions/camunda-X.Y/`).
- Keep changes version-scoped; the release workflow handles each version independently.
- Read `STATE.md` at repo root if it exists (session continuity file, gitignored).

## Docker Compose Contracts

- Treat the Compose distributions as local development and evaluation environments, not production deployment definitions.
- Preserve each documented entry point. Standalone Web Modeler/Hub must start with one selected Compose file, without prerequisite Compose commands or layering Camunda Compose files.
- Docker `configs.content` already creates mounted application configuration; keep lightweight configs inline when that preserves the compact workflow.
- Full-stack component sidecars are intentional. Do not merge them into `configuration/`, which holds selectable Orchestration configuration where present.
- Keep Spring environment variables usable as overrides and keep secret delivery environment-based (`.env`, `env_file`, or exported variables). Do not embed resolved secrets in application YAML.
- When translating application settings, use the matching version's component or Helm schema; do not copy configuration mechanically across versions.

## Commit and Branch Conventions

- Branches: `issueId-description` (e.g., `423-fix-8-10-postgres-config`)
- Commit/PR titles: Conventional Commits — `<type>(<scope>): <description>`
- Common types: `feat`, `fix`, `docs`, `ci`, `deps`, `chore`
- Scope: `docker-compose` for compose file changes, `github-actions` for workflow changes

## State File

Use `STATE.md` (repo root, gitignored) to persist session context across conversations.

**On session start:** Read `STATE.md` if it exists. **During work:** Update whenever you complete a task, make a key decision, or discover something important.

```markdown
## Goal
## Instructions
## Discoveries
## Accomplished
## Not Yet Done
## Relevant Files
```

## Reference Docs

- `docs/index.md` — repository overview and directory map
- `docs/commands.md` — Docker Compose and E2E test commands
- `docs/version-architecture.md` — per-version compose flavors, storage backends, 8.10 ES changes
- `docs/e2e-testing.md` — test layout, running locally, CI matrix
- `docs/ci-workflows.md` — CI/CD workflow architecture, release model, Renovate config
