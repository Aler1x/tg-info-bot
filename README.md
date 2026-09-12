# Telegram update info bot

Send or forward any message to this bot and it replies with the raw Telegram [`Update`](https://core.telegram.org/bots/api#update) JSON it received — chat ids, user ids, stickers, custom emoji, forwards, and everything else on the payload.

**Stack:** Workers (TypeScript), grammY, Hono, pnpm, `wrangler.jsonc`.

**Not included:** long polling.

## What it does

| Route / command | Behavior |
|-----------------|----------|
| `POST /webhook` | Receives Telegram updates; verifies `X-Telegram-Bot-Api-Secret-Token` |
| `GET /health` | `{ "ok": true }` |
| `/start` | Short help text, then the raw update for that message |
| `/help` | Short help text |
| Any other update with a chat | Pretty-printed `ctx.update` JSON (split across messages if needed) |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)
- [Cloudflare account](https://dash.cloudflare.com/) + [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (`pnpm dlx wrangler login`)

## Setup

### 1. Create a Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot`, follow prompts, copy the **bot token**.

### 2. Install dependencies

```bash
pnpm i
```

### 3. Set secrets

```bash
wrangler secret put BOT_TOKEN
wrangler secret put BOT_SECRET
```

Use the token from BotFather. `BOT_SECRET` is any long random string — you will pass the same value to `setWebhook` as `secret_token`.

For local dev, create `.dev.vars` (gitignored) with the same keys.

### 4. Deploy

```bash
pnpm deploy
```

Note the Worker URL, e.g. `https://tg-info-bot.<account>.workers.dev`.

### 5. Register the webhook

Create a `.env` (gitignored) with `BOT_TOKEN`, `BOT_SECRET`, and `WORKER_URL` (the deployed Worker origin, no `/webhook` suffix). Then:

```bash
pnpm webhook:set
```

You can also pass the Worker URL as an argument: `pnpm webhook:set https://<worker-url>`.

Open the bot in Telegram and send or forward any message. You should get the update JSON back.

## Local development

```bash
pnpm dev
```

Workers are **request-driven**. This bot uses **webhooks only** — not long polling.

To test webhooks locally you need a public URL that forwards to `wrangler dev`, for example:

- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (`cloudflared tunnel --url http://localhost:8787`)
- [ngrok](https://ngrok.com/) or similar

Point `setWebhook` at `https://<tunnel-host>/webhook` with the same `secret_token`. Re-run `setWebhook` with your production URL after testing.

## Project layout

```
src/
  index.ts          # Hono app: /webhook, /health
  bot.ts            # grammY bot — dumps ctx.update as JSON
scripts/
  set-webhook.sh
  webhook-info.sh
wrangler.jsonc
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Local Worker |
| `pnpm deploy` | Deploy to Cloudflare |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm webhook:set` | Register Telegram webhook from `.env` |
| `pnpm webhook:info` | Show Telegram `getWebhookInfo` (URL, errors, pending) |

## Troubleshooting

- **401 on webhook** — `BOT_SECRET` must match `secret_token` in `setWebhook`.
- **Bot silent** — run `pnpm webhook:info` and `npx wrangler tail`. Telegram orange checks only mean Telegram got the message, not that the Worker did. Confirm the webhook URL ends with `/webhook`.

## License

MIT
