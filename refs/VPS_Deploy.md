# Manual VPS deployment

Use this runbook to deploy an already-built Monovella image to the VPS. It
pulls the image references declared in `.env.production`, runs database
migrations, then recreates changed services using
`docker-compose.production.yml`. It never builds source code on the server.

Complete [VPS_Setup.md](VPS_Setup.md) first. Examples use
`/opt/monovella/production` and the `deploy` user.

## Deployment inputs

By the end of VPS_Setup.md, the VPS already has these three files in place:

```text
docker-compose.production.yml
Caddyfile.production
.env.production
```

`docker-compose.production.yml` must reference images through `image:` fields,
not `build:` fields. Its application services should use stable names such as
`api`, `web`, `worker`, `scheduler`, `postgres`, `redis`, `rustfs`, `clamav`,
and `caddy`; the
commands below assume those names. Keep database and Caddy data in named
volumes.

`.env.production` stays only on the VPS and must be mode `600`. It holds the
new immutable image tag or digest before deployment. Use a digest or a unique
release tag, never a mutable `latest` tag, so a rollback can name the exact
previous image.

Whenever any of the three files' contents change later, update them the same
way VPS_Setup.md did the first time: `scp` the two non-secret files, edit
`.env.production` directly on the VPS. "Deploy an image update" below covers
the routine case of just changing an image reference.

## Build and push an image

Do this from a trusted local checkout, before the first deployment and
before every later image update. It runs on your machine, not the VPS —
[VPS_Setup.md](VPS_Setup.md) already establishes that the VPS only pulls
prebuilt images and never builds source.

Create a GitHub personal access token scoped to `write:packages` (this is
separate from the VPS's own `read:packages` token from VPS_Setup.md step 6).
Run only this first command, on its own — pasting it together with what
follows lets the shell move on before you've typed anything, so the token
comes through empty:

```bash
read -rsp "VPS GHCR Push PAT: " GHCR_TOKEN
```

Wait for the `VPS GHCR Push PAT: ` prompt, then paste your token (`read -s` hides
it and keeps it out of shell history) and press Enter. Only after that,
run:

```bash
docker login ghcr.io -u <github-username> --password-stdin <<< "$GHCR_TOKEN"
unset GHCR_TOKEN
```

Build and push each image, tagged with that service's own version from its
manifest — `api/pyproject.toml`'s `version` and `web/package.json`'s
`version` — not the root `VERSION` file. Root `VERSION` names the overall
repository release (root `AGENTS.md`'s release policy); `api/` and `web/`
version independently per that same policy and don't always bump together,
so each image should carry its own service's version, not the shared
release number. Bump the relevant manifest(s) as part of the
`chore(release):` commit before building; rebuilding at the same version
overwrites that tag in the registry, which is why `.env.production` still
pins the digest below, not the tag:

```bash
API_TAG=$(sed -n 's/^version = "\(.*\)"$/\1/p' api/pyproject.toml)
WEB_TAG=$(sed -n 's/.*"version": "\(.*\)",\?$/\1/p' web/package.json)

docker build -t ghcr.io/<github-username>/monovella-api:$API_TAG api
docker push ghcr.io/<github-username>/monovella-api:$API_TAG

docker build -t ghcr.io/<github-username>/monovella-web:$WEB_TAG web
docker push ghcr.io/<github-username>/monovella-web:$WEB_TAG
```

Each `docker push` prints the pushed digest as `Digest: sha256:...`. Use
that digest, not the tag, in `.env.production` — a tag can later be pushed
again and overwritten, a digest can't:

```text
API_IMAGE=ghcr.io/<github-username>/monovella-api@sha256:<digest-from-push>
WEB_IMAGE=ghcr.io/<github-username>/monovella-web@sha256:<digest-from-push>
```

Set both variables in `.env.production` on the VPS as described in
[VPS_Setup.md](VPS_Setup.md) step 5. If the packages are private, the VPS's
own GHCR login from step 6 there is what lets `docker compose pull` succeed
below.

## First deployment

VPS_Setup.md already placed all three files above and validated them with
its own `config --quiet` check (step 8) — nothing left to upload or create.
Connect and deploy:

```bash
ssh -i ~/.ssh/monovella_deploy deploy@<vps-host>
cd /opt/monovella/production

docker compose --env-file .env.production \
  -f docker-compose.production.yml config --quiet

docker compose --env-file .env.production \
  -f docker-compose.production.yml pull

docker compose --env-file .env.production \
  -f docker-compose.production.yml up -d --wait postgres redis

docker compose --env-file .env.production \
  -f docker-compose.production.yml run --rm api alembic upgrade head

docker compose --env-file .env.production \
  -f docker-compose.production.yml up -d --remove-orphans
```

If the production Compose file uses different database service names, replace
only `postgres redis` in the third command. Do not replace the migration
command with a shell command that connects to the database as root.

## Deploy an image update

1. Build and push the tested image (see "Build and push an image" above).
2. Update only the relevant image variable in
   `/opt/monovella/production/.env.production` to its new immutable tag or
   digest. Copy revised Compose/Caddy files if the release changes them.
3. Run the exact command sequence below:

```bash
cd /opt/monovella/production

docker compose --env-file .env.production \
  -f docker-compose.production.yml config --quiet

docker compose --env-file .env.production \
  -f docker-compose.production.yml pull

docker compose --env-file .env.production \
  -f docker-compose.production.yml up -d --wait postgres redis

docker compose --env-file .env.production \
  -f docker-compose.production.yml run --rm api alembic upgrade head

docker compose --env-file .env.production \
  -f docker-compose.production.yml up -d --remove-orphans
```

`pull` downloads images without changing running containers. The final `up -d`
recreates only services whose image or configuration changed and leaves named
volumes intact. Do not use `down -v`, `docker volume rm`, or broad image-prune
commands during a normal release.

## Verify the release

Immediately after deployment:

```bash
docker compose --env-file .env.production \
  -f docker-compose.production.yml ps

docker compose --env-file .env.production \
  -f docker-compose.production.yml logs --tail=100 caddy web api worker scheduler

curl --fail --show-error --location https://<production-hostname>/
```

If `/api/health` is intentionally proxied, check it too:

```bash
curl --fail --show-error https://<production-hostname>/api/health
```

The current health endpoint reports a failure until Postgres, Redis, and the
background heartbeat are all healthy, so make sure worker and scheduler
services are running before treating a non-2xx health response as a proxy
problem. Check Caddy's certificate and routing logs with:

```bash
docker compose --env-file .env.production \
  -f docker-compose.production.yml logs --tail=200 caddy
```

For staging/local production, verify `http://localhost:9800` instead.

## Roll back

Roll back by restoring the previous known-good immutable image references in
`.env.production`, then run the same validation, pull, migration, and `up -d`
sequence. Keep a small release record with the image digest and deployment
time so the previous value is unambiguous.

Database migrations are not automatically reversible. Before deploying a
schema-changing release, confirm that the new code remains compatible with the
previous schema. If it is not, stop and prepare a tested database rollback or
forward-fix plan before deploying.

## Troubleshooting

- `pull` returns `denied`: re-authenticate `deploy` to GHCR and verify the
  token has `read:packages` plus access to the package.
- `config --quiet` fails: fix the missing environment variable or Compose
  syntax before changing containers.
- Migration fails: do not run the final `up -d`; inspect the migration output
  and database connectivity first.
- Caddy cannot obtain a certificate: verify the public DNS record points to
  this VPS and that ports 80 and 443 are reachable, then inspect Caddy logs.
- A service repeatedly restarts: inspect that service's logs with
  `docker compose ... logs --tail=200 <service>` and keep the previous image
  reference available for rollback.
- Termii delivery-report events never arrive, or `POST /api/webhooks/termii`
  returns 401 for every request: `TERMII_WEBHOOK_SECRET` in
  `.env.production` is unset or doesn't match the value configured in the
  Termii console's webhook settings. It's separate from `TERMII_API_KEY`.
  This fails silently — no crash, no error from `config --quiet` or
  `up -d` — so check it explicitly rather than waiting for a symptom.
- ZeptoMail bounce/open/click/delivered/feedback-loop events never arrive,
  or `POST /api/webhooks/zeptomail` returns 401 for every request:
  `ZEPTO_WEBHOOK_SECRET` in `.env.production` doesn't exactly match the
  value entered for the `X-ZeptoMail-Signature` Authorization header in the
  ZeptoMail agent's "Add webhook" form. It's separate from `ZEPTO_API_KEY`.
  Same silent-failure caveat as Termii's webhook secret above — check it
  explicitly. Also double-check the Webhook URL field itself is
  `https://<production-hostname>/api/webhooks/zeptomail` — every API route
  lives under `/api` now, so a URL missing that prefix 404s the same way
  `/api/webhooks/*` routing failures do, below.
- Either webhook returns a connection error, 502, or 404 instead of 401 —
  that's a routing problem, not a secret problem: `Caddyfile.production`'s
  `/api/webhooks/*` route (VPS_Setup.md § 7) isn't reaching the `api`
  service. Confirm the file mounted into the `caddy` container actually has that
  block (`docker compose exec caddy cat /etc/caddy/Caddyfile`) and that the
  `api` service is up (`docker compose ps api`).
