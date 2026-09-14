# VPS setup

This runbook prepares one Ubuntu VPS to run Monovella's production Compose
stack. The VPS pulls already-built container images; it does not build source
code or run a CI deploy agent.

The production stack is defined by `docker-compose.production.yml` and its
secret `.env.production` file. Caddy runs in that stack as the only public
service. Postgres, Redis, the API, workers, and the web container must remain
on the private Compose network.

## Before starting

- Use a supported Ubuntu LTS VPS with at least 2 GB RAM and persistent block
  storage for Postgres.
- Point the production hostname's `A` record, and its `AAAA` record if used,
  at this VPS before starting Caddy. Caddy needs public reachability on ports
  80 and 443 to issue and renew its TLS certificate.
- Have a GitHub Container Registry (GHCR) token with only `read:packages`
  scope if the application images are private.
- Keep the provider console available until SSH access as `deploy` is tested.

This guide uses `/opt/monovella/production` as the application directory and
the non-root `deploy` account. Change both consistently if your organisation
uses another location or account.

## 1. Update the host and create the deploy account

Connect as the VPS provider's initial administrator:

```bash
ssh root@<vps-ip>
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg ufw
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
```

`sudo` prompts for `deploy`'s login password before running a privileged
command, so set one now. This password is separate from SSH access: SSH
login still uses the key from the next step only, and step 3 disables SSH
password login entirely, so this password is only ever typed at a local
`sudo` prompt, never sent over the network.

Because it is typed by hand at a `sudo` prompt during maintenance rather
than pasted from a password manager every time, a memorable passphrase
(four or more unrelated words, e.g. `correct-horse-battery-staple`) is a
reasonable choice here — it only needs to resist guessing, not
credential-stuffing, since it is never used over the network. If you'd
rather use a random string instead, generate one with:

```bash
openssl rand -base64 24
```

Either way, save it in your password manager now, then run `passwd deploy`
and enter it at both prompts (`passwd` requires typing or pasting it
interactively — it cannot take the password as a command argument):

```bash
passwd deploy
# New password: <paste>
# Retype new password: <paste>
```

Generate a dedicated keypair for this account on your local machine — not on
the VPS — rather than reusing a personal key, so revoking VPS access later
never touches your other SSH access:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/monovella_deploy -C "deploy@monovella-vps"
```

Back on the VPS, in the still-open root session, install the resulting public
key for the new account:

```bash
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /dev/null /home/deploy/.ssh/authorized_keys
```

Paste the contents of `~/.ssh/monovella_deploy.pub` on a separate line into
`/home/deploy/.ssh/authorized_keys`, then, in a new terminal, verify it before
changing SSH settings:

```bash
ssh -i ~/.ssh/monovella_deploy deploy@<vps-ip>
whoami  # deploy
```

`authorized_keys` grants access per public key, not per private key holder.
To give another maintainer `deploy` access, have them generate their own
keypair and append only their public key as an additional line in
`/home/deploy/.ssh/authorized_keys` — never share the private key above.
Revoke one person's access later by deleting just their line; the others are
unaffected.

## 2. Install Docker Engine and the Compose plugin

Run as root on the VPS:

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
usermod -aG docker deploy
```

Reconnect as `deploy` so the new group membership applies, then verify:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Membership of the `docker` group is root-equivalent. Give it only to trusted
maintainers. A separate `sudo` grant is not required for routine deployments.

## 3. Restrict host access

Still as root, allow only SSH and Caddy's HTTP/S listeners:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

Docker-published ports can bypass UFW rules. The production Compose file must
publish only Caddy's `80:80` and `443:443` ports. Do not publish Postgres,
Redis, API, worker, or web ports, including temporarily for debugging. Use
`docker compose exec` from the VPS instead.

Optional SSH hardening, after confirming the `deploy` key works and keeping
the original root session open:

```bash
cat > /etc/ssh/sshd_config.d/00-monovella.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
EOF
sshd -t
systemctl reload ssh.service
```

Confirm `ssh -i ~/.ssh/monovella_deploy deploy@<vps-ip>` still succeeds before
closing the original session. Recover from an SSH mistake through the VPS
provider console.

With `PermitRootLogin no` set, root is no longer reachable over SSH at all.
All host administration — package updates, further `sshd`/UFW changes,
anything needing root — goes through `sudo` as `deploy` (`sudo apt upgrade`,
`sudo nano /etc/ssh/sshd_config.d/00-monovella.conf`, etc.), authenticated
with the password set in step 1. The provider console remains the only
fallback if `deploy`'s key or password is ever lost.

## 4. Create the deployment directory

As `deploy`, using `sudo` — root is no longer reachable directly once step
3's hardening is applied — create the directory and give `deploy` sole
access:

```bash
sudo install -d -m 700 -o deploy -g deploy /opt/monovella/production
cd /opt/monovella/production
```

The directory will contain only deployment inputs:

```text
/opt/monovella/production/
├── docker-compose.production.yml  # committed, non-secret deployment definition
├── Caddyfile.production            # committed, non-secret proxy rules
└── .env.production                 # VPS-only secrets and image tags; mode 600
```

The exact Caddyfile name is referenced by the Compose file. It may be mounted
read-only at `/etc/caddy/Caddyfile`; do not edit files inside the Caddy
container.

Upload the two committed, non-secret files now, from a trusted local
checkout of this repository — `.env.production` is the third file, created
directly on the VPS in the next step, never copied from a local machine:

```bash
scp -i ~/.ssh/monovella_deploy docker-compose.production.yml Caddyfile.production \
  deploy@<vps-ip>:/opt/monovella/production/
```

## 5. Prepare the production environment file

Before creating this file, build and push at least one image so you have
real `WEB_IMAGE`/`API_IMAGE` values to put in it — see
[VPS_Deploy.md § Build and push an image](VPS_Deploy.md#build-and-push-an-image).
That step runs entirely on your local machine and needs no VPS access, so
do it now if you haven't already; `docker-compose.production.yml` requires
both variables and step 8 below will fail without them.

Create the file on the VPS; never copy it into the repository or an image:

```bash
cd /opt/monovella/production
umask 077
nano .env.production
chmod 600 .env.production
```

It must provide every variable consumed by
`docker-compose.production.yml`, including the `WEB_IMAGE`/`API_IMAGE`
digests from the step above, database and Redis credentials, `SECRET_KEY`,
the `RUSTFS_ACCESS_KEY`/`RUSTFS_SECRET_KEY` pair for the in-stack object
store (and the matching `STORAGE_*` values the app uses to reach it),
external messaging credentials, payment (`NOMBA_*`) and call (`LIVEKIT_*`)
credentials, and the public web URL. Anything left unset fails closed —
uploads, payments and calls refuse rather than degrade — so an incomplete
file starts cleanly but disables those features. Generate a unique
app secret with:

```bash
openssl rand -hex 32
```

Set `ENV=production`, `API_DEBUG=false`, and `WEB_APP_URL=https://<production-hostname>`.
The web service should use its internal service URL, such as
`MONOVELLA_API_URL=http://api:8000`; it must not depend on a host-published API
port.

## 6. Log in to the image registry

Run this as `deploy`. Run only this first command, on its own — it must be
its own step, not pasted together with what follows, or the shell moves on
before you've typed anything and the token comes through empty:

```bash
read -rsp "VPS GHCR Read PAT: " GHCR_TOKEN
```

Wait for the `VPS GHCR Read PAT: ` prompt, then paste your token (`read -s` hides
it and keeps it out of shell history) and press Enter. Only after that,
run:

```bash
docker login ghcr.io -u <github-username> --password-stdin <<< "$GHCR_TOKEN"
unset GHCR_TOKEN
```

Docker stores its registry credential in `/home/deploy/.docker/config.json`.
Rotate the token before expiry and repeat this login. If images are public,
skip this step.

## 7. Caddy requirements for staging and production

Caddy belongs in both production-like stacks, not on the host. This gives the
same reverse-proxy behavior before real production traffic reaches the app.

| Environment | Caddy address | TLS behaviour | Purpose |
|---|---|---|---|
| Staging / local production | `localhost:9800` | Plain HTTP at `http://localhost:9800` | Verify the production image and proxy configuration locally. |
| Production | Public application hostname | Automatic ACME certificate issuance and renewal | Serve end-user traffic. |

The whole API is mounted under `/api` (`api/src/api/main.py`), but Caddy
still only routes one path prefix under it to the API — the rest of `/api`
stays private, reached only by `web`'s server-side calls over the internal
network. The one exception is `/api/webhooks/*` (Termii and ZeptoMail
delivery/event callbacks — `api/src/api/routes/webhook.py`), which routes
straight to `api:8000`: those calls originate from Termii's and ZeptoMail's
own servers, not a browser, so they cannot reach the API over the private
network the way `web`'s server-side calls do. Any other public API route
follows the same pattern — an explicit path prefix routed to `api:8000` in
the Caddyfile, never the API container's port published directly.

Use the environment-specific files committed at the repository root:

```text
Caddyfile.staging     # http://localhost:9800 → web:3000, /api/webhooks/* → api:8000
Caddyfile.production  # app.monovella.com → web:3000, /api/webhooks/* → api:8000
```

Mount the appropriate file read-only into the Compose `caddy` service. It must
publish only `80:80` and `443:443`, and persist Caddy's `/data` and `/config`
directories.

Persist Caddy's `/data` and `/config` volumes. Losing them does not lose app
data, but it makes Caddy obtain certificates again and can trigger CA rate
limits.

## 8. First-deploy readiness check

Before following [VPS_Deploy.md](VPS_Deploy.md), confirm the files are in
place and the Compose model is valid:

```bash
cd /opt/monovella/production
ls -la
stat -c '%a %n' .env.production  # expect: 600 .env.production
docker compose --env-file .env.production \
  -f docker-compose.production.yml config --quiet
```

The `config --quiet` command must exit successfully without printing secret
values. Continue with the manual deployment runbook only after it passes —
[VPS_Deploy.md](VPS_Deploy.md)'s first deployment step re-runs this exact
command immediately before pulling images, so passing it here just catches
a configuration mistake early instead of after a slow image pull.

## Ongoing host maintenance

- Apply Ubuntu security updates regularly (`sudo apt update && sudo apt
  upgrade`) and reboot during a maintenance window when required.
- Back up the named Postgres and RustFS volumes off the VPS and test a
  restore before treating the service as recoverable. The RustFS volume
  holds patient result files; losing it loses them.
- Check `docker compose ps`, Caddy logs, free disk space, and certificate
  renewal after the first deploy and after upgrades.
