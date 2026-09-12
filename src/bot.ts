import { Bot, InlineQueryResultBuilder } from "grammy";
import type { Context } from "grammy";
import type { Update, UserFromGetMe } from "grammy/types";

export interface BotEnv {
  BOT_TOKEN: string;
}

function helpText(username: string): string {
  const mention = `<code>@${escapeHtml(username)}</code>`;
  return (
    "Send or forward any message and I'll send the raw Telegram <code>Update</code> I received — chat ids, user ids, stickers, forwards, the lot.\n\n" +
    `Mention ${mention} in any chat, or reply to a message with ${mention}, and I'll dump that update there.`
  );
}

const PRE_LIMIT = 3900;

let botInfo: UserFromGetMe | undefined;

export async function createBot(env: BotEnv): Promise<Bot> {
  const bot = new Bot(env.BOT_TOKEN, { botInfo });
  if (botInfo === undefined) {
    await bot.init();
    botInfo = bot.botInfo;
  }

  const help = helpText(bot.botInfo.username);

  bot.command("start", async (ctx) => {
    await ctx.reply(help, { parse_mode: "HTML" });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(help, { parse_mode: "HTML" });
  });

  bot.on("inline_query", async (ctx) => {
    const chunks = chunkJson(ctx.update);
    const results = chunks.map((chunk, index) => {
      const title =
        chunks.length === 1
          ? "Raw Telegram update"
          : `Raw Telegram update (${index + 1}/${chunks.length})`;
      return InlineQueryResultBuilder.article(`update-${index}`, title, {
        description: "Send the Update JSON for this inline query",
      }).text(`<pre>${escapeHtml(chunk)}</pre>`, { parse_mode: "HTML" });
    });

    await ctx.answerInlineQuery(results, {
      cache_time: 0,
      is_personal: true,
    });
  });

  bot.use(async (ctx, next) => {
    const queryId = getGuestQueryId(ctx.update);
    if (queryId) {
      await sendGuestDump(ctx, queryId, ctx.update);
      return;
    }
    await next();
  });

  bot.use(async (ctx) => {
    if (!ctx.chat) return;
    await sendUpdateDump(ctx, ctx.update);
  });

  return bot;
}

type GuestApi = {
  answerGuestQuery(args: {
    guest_query_id: string;
    result: unknown;
  }): Promise<unknown>;
};

function getGuestQueryId(update: Update): string | undefined {
  if (!("guest_message" in update)) return undefined;
  const message = (update as { guest_message?: { guest_query_id?: string } })
    .guest_message;
  return message?.guest_query_id;
}

async function sendGuestDump(
  ctx: Context,
  guestQueryId: string,
  update: Update,
): Promise<void> {
  const [chunk] = chunkJson(update);
  if (chunk === undefined) return;

  await (ctx.api.raw as GuestApi).answerGuestQuery({
    guest_query_id: guestQueryId,
    result: InlineQueryResultBuilder.article("dump", "Raw Telegram update").text(
      `<pre>${escapeHtml(chunk)}</pre>`,
      { parse_mode: "HTML" },
    ),
  });
}

async function sendUpdateDump(ctx: Context, update: Update): Promise<void> {
  const chunks = chunkJson(update);
  for (const chunk of chunks) {
    await ctx.reply(`<pre>${escapeHtml(chunk)}</pre>`, {
      parse_mode: "HTML",
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
