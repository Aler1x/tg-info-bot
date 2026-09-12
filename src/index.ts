import { Hono } from "hono";

import { createBot } from "./bot";

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  BOT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/webhook", async (c) => {
  const secret = c.req.header("X-Telegram-Bot-Api-Secret-Token");
  if (!secret || secret !== c.env.BOT_SECRET) {
    console.warn("webhook rejected: secret mismatch or missing");
    return c.text("Unauthorized", 401);
  }

  const update = await c.req.json();
  console.log("webhook update", {
    update_id: update?.update_id,
    has_text: Boolean(update?.message?.text),
    has_sticker: Boolean(update?.message?.sticker),
    has_inline_query: Boolean(update?.inline_query),
    has_guest_message: Boolean(update?.guest_message),
  });

  try {
    const bot = await createBot(c.env);
    await bot.handleUpdate(update);
    return c.text("OK");
  } catch (err) {
    console.error("webhook handleUpdate failed", err);
    return c.text("Error", 500);
  }
});

export default app;
