#!/usr/bin/env bash
#
# Prepare a fresh Ubuntu/Debian host to run ViralCut: Docker, swap, and a disk
# check. Run once as root (or with sudo) before the first `docker compose up`.
#
#   sudo ./scripts/bootstrap-server.sh
#
# Deliberately does NOT touch the firewall. Enabling ufw without first allowing
# SSH locks you out of your own server, and getting back in usually means a
# console session with the provider. The commands are printed at the end so you
# can run them yourself, in the right order, with your session in front of you.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this with sudo — it installs packages and configures swap." >&2
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script targets Ubuntu/Debian. On another distro, install Docker" >&2
  echo "Engine + the compose plugin manually and skip to setup-env.sh." >&2
  exit 1
fi

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# --- Docker ----------------------------------------------------------------
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  say "Docker already installed — $(docker --version)"
else
  say "Installing Docker Engine and the compose plugin"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg

  install -m 0755 -d /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/docker.asc ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
  fi

  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list

  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker
fi

# --- Swap ------------------------------------------------------------------
# x264 encoding several segments at once peaks well above idle. On a 4 GB box
# without swap the kernel kills the worker mid-render, which surfaces as a job
# that just fails with no useful message.
TOTAL_MB=$(free -m | awk '/^Mem:/ {print $2}')
SWAP_MB=$(free -m | awk '/^Swap:/ {print $2}')

if [ "$SWAP_MB" -ge 2048 ]; then
  say "Swap already present (${SWAP_MB} MB) — leaving it alone"
elif [ -f /swapfile ]; then
  say "/swapfile exists but is not active — skipping so nothing is clobbered"
  echo "    Inspect it yourself, or remove it and re-run."
else
  say "Adding a 4 GB swapfile (RAM: ${TOTAL_MB} MB, swap: ${SWAP_MB} MB)"
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- Disk ------------------------------------------------------------------
# Sources, intermediates, and renders all land on disk at once. A 25-minute job
# can hold several GB before the work directory is cleared.
AVAIL_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
say "Free space on /: ${AVAIL_GB} GB"
if [ "$AVAIL_GB" -lt 20 ]; then
  echo "    Under 20 GB. Renders will run out of room — add a volume before going live."
fi

if [ "$TOTAL_MB" -lt 3500 ]; then
  echo
  echo "    RAM is ${TOTAL_MB} MB. Rendering will work but slowly; consider"
  echo "    lowering WORKER_CONCURRENCY to 1 in .env."
fi

# --- What's left -----------------------------------------------------------
cat <<'EOF'

==> Host is ready.

Firewall — run these yourself, in this order. Allowing SSH FIRST is what keeps
you from being locked out:

    sudo ufw allow OpenSSH
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw enable

Then, as your normal user:

    ./scripts/setup-env.sh
    # fill in DOMAIN, ACME_EMAIL, AUTH_GOOGLE_*, OPENAI_API_KEY
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

Point the domain's A record at this host BEFORE that last command — Caddy proves
ownership over ports 80 and 443 and will keep retrying until DNS resolves here.

    docker compose logs -f web worker caddy
EOF
