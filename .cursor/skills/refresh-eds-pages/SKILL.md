---
name: refresh-eds-pages
description: >-
  Refresh AEM Edge Delivery composed pages by loading ssr/.env, dry-running the
  path list, then previewing and publishing in batches until complete. Use when
  the user types "refresh eds pages", asks to refresh composed/PDP pages, or
  wants a bulk overlay re-preview and republish after a compose or feature-flag
  change.
---

# Refresh EDS pages

Re-ingest every composed page (overlay preview, then publish) so live HTML matches the **currently deployed** compose action.

This does **not** deploy App Builder. If compose/flag code changed, deploy first (`npm run ssr:deploy`), then run this skill.

## Workflow

Run from the repo root. Copy this checklist:

```
Refresh EDS pages:
- [ ] Load ssr/.env without printing secrets
- [ ] Dry-run and show the path list
- [ ] Preview and publish in batches
- [ ] Confirm completion to the user
```

### 1. Load env

Load `ssr/.env` into the shell so `AEM_ADMIN_TOKEN` (and optional `AEM_ORG` / `AEM_SITE` / `AEM_BRANCH`) are set. The refresh script does not read `.env` itself.

```bash
set -a && source ssr/.env && set +a
```

**Never** `cat` `ssr/.env`, never echo `AEM_ADMIN_TOKEN`, never paste the token into chat.

If `ssr/.env` is missing or `AEM_ADMIN_TOKEN` is empty, stop. Tell the user to add a Sidekick token from `https://admin.hlx.page/login/{org}/{site}/{branch}` (not an `aio` token).

### 2. Dry-run

```bash
node ssr/scripts/refresh-composed.mjs --dry-run
```

Show the user the listed paths. If the script prints `no composed pages found` or exits non-zero, stop; do not publish.

### 3. Preview and publish

```bash
node ssr/scripts/refresh-composed.mjs --batch 50
```

The script previews then publishes each batch sequentially (do not parallelize). Jobs can take several minutes; wait for the process to finish. Raise `--batch` only if the user asks.

### 4. Confirm

Success: exit code 0 and stdout contains `refresh complete`. Tell the user refresh finished, how many pages were in the dry-run list, and that live CDN HTML updates after publish (hard refresh if they still see old markup).

Failure: exit non-zero or `batch(es) failed`. Report the script output (still redact tokens). Do not retry in a loop unless the user asks.

## Commands (do not substitute)

- Dry-run: `node ssr/scripts/refresh-composed.mjs --dry-run`
- Refresh: `node ssr/scripts/refresh-composed.mjs --batch 50`

Do not use `wire-overlay.mjs` for this skill unless the user names specific paths instead of a full refresh.
