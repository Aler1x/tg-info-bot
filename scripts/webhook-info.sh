#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="${root}/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing ${env_file}. Copy .env.example to .env and fill in BOT_TOKEN." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "BOT_TOKEN is empty in .env" >&2
  exit 1
fi

curl -sS "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
echo
