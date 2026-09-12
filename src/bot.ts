import { Bot } from "grammy";
import type { Context } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";

export interface BotEnv {
  BOT_TOKEN: string;
}

const HELP =
  "Send or forward any message and I'll reply with the raw Telegram <code>Update</code> I received — chat ids, user ids, stickers, forwards, the lot.";

const PRE_LIMIT = 3900;

let botInfo: UserFromGetMe | undefined;

export async function createBot(env: BotEnv): Promise<Bot> {
  const bot = new Bot(env.BOT_TOKEN, { botInfo });
  if (botInfo === undefined) {
    await bot.init();
    botInfo = bot.botInfo;
  }

  bot.command("start", async (ctx) => {
    await ctx.reply(HELP, { parse_mode: "HTML" });
    await replyUpdateDump(ctx, ctx.update);
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP, { parse_mode: "HTML" });
  });

  bot.use(async (ctx) => {
    if (!ctx.chat) return;
    await replyUpdateDump(ctx, ctx.update);
  });

  return bot;
}

async function replyUpdateDump(ctx: Context, update: Update): Promise<void> {
  const chunks = chunkJson(update);
  for (const chunk of chunks) {
    await ctx.reply(`<pre>${escapeHtml(chunk)}</pre>`, {
      parse_mode: "HTML",
      reply_parameters: ctx.msg
        ? { message_id: ctx.msg.message_id }
        : undefined,
    });
  }
}

function chunkJson(value: unknown): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of JSON.stringify(value, undefined, 2).split("\n")) {
    for (const piece of splitLine(line)) {
      const next = current.length === 0 ? piece : `${current}\n${piece}`;
      if (escapeHtml(next).length > PRE_LIMIT && current.length > 0) {
        chunks.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function splitLine(line: string): string[] {
  if (escapeHtml(line).length <= PRE_LIMIT) return [line];

  const pieces: string[] = [];
  let buffer = "";
  for (const char of line) {
    const next = buffer + char;
    if (escapeHtml(next).length > PRE_LIMIT && buffer.length > 0) {
      pieces.push(buffer);
      buffer = char;
    } else {
      buffer = next;
    }
  }
  if (buffer.length > 0) pieces.push(buffer);
  return pieces;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
