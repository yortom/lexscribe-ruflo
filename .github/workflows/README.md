# CI/CD

- `pr.yml` — runs on PRs to main: lint, type-check, tests, build dry-run.
- `deploy-staging.yml` — runs on push to main: builds and pushes Docker images to GHCR with tags `staging` + `<sha>`, then notifies NAS staging webhook.
- `deploy-prod.yml` — runs on tag `v*`: builds and pushes Docker images to GHCR with tags `prod` + `<tagname>`, then notifies NAS prod webhook + sends deployment notification.

## Required repository secrets

- `NAS_STAGING_WEBHOOK_URL`
- `NAS_STAGING_WEBHOOK_TOKEN`
- `NAS_PROD_WEBHOOK_URL`
- `NAS_PROD_WEBHOOK_TOKEN`
- `DEPLOY_NOTIFICATION_WEBHOOK` (optional — Discord/Slack)
