#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
env_file="${root}/.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing ${env_file}. Copy .env.example to .env and fill in BOT_TOKEN, BOT_SECRET, and WORKER_URL." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ -n "${1:-}" ]]; then
  WORKER_URL="$1"
fi

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "BOT_TOKEN is empty in .env" >&2
  exit 1
fi

if [[ -z "${BOT_SECRET:-}" ]]; then
  echo "BOT_SECRET is empty in .env" >&2
  exit 1
fi

if [[ -z "${WORKER_URL:-}" ]]; then
  echo "WORKER_URL is empty. Set it in .env or pass it as the first argument." >&2
  exit 1
fi

WORKER_URL="${WORKER_URL%/}"

payload="$(
  BOT_SECRET="$BOT_SECRET" WORKER_URL="$WORKER_URL" node -e '
    const { BOT_SECRET, WORKER_URL } = process.env;
    process.stdout.write(JSON.stringify({
      url: `${WORKER_URL}/webhook`,
      secret_token: BOT_SECRET,
    }));
  '
)"

curl -sS -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H 'content-type: application/json' \
  -d "$payload"
echo

echo "Webhook set to ${WORKER_URL}/webhook"
