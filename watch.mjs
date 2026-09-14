#!/usr/bin/env node
/**
 * Папаша — CLI-брифинг.
 * Источник: публичный JSON TVMaze (официальный эфир), show id 215.
 *
 *   node watch.mjs
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node watch.mjs
 *
 * Повторять раз в сутки с cron, например:
 *   0 9 * * * TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node /path/watch.mjs
 */

const SHOW_ID = 215;
const SHOW_URL = `https://api.tvmaze.com/shows/${SHOW_ID}`;
const EPISODES_URL = `https://api.tvmaze.com/shows/${SHOW_ID}/episodes?specials=1`;

function code(ep) {
  const s = String(ep.season ?? "?").padStart(2, "0");
  const n = String(ep.number ?? "?").padStart(2, "0");
  return `S${s}E${n}`;
}

function ruDate(iso) {
  if (!iso) return "дата не объявлена";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TVMaze ${res.status} ${url}`);
  return res.json();
}

async function main() {
  const [show, episodes] = await Promise.all([
    fetchJson(SHOW_URL),
    fetchJson(EPISODES_URL),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const numbered = episodes.filter((ep) => ep.number != null);
  const aired = numbered
    .filter((ep) => ep.airdate && ep.airdate <= today)
    .sort((a, b) => b.airdate.localeCompare(a.airdate));
  const upcoming = numbered
    .filter((ep) => !ep.airdate || ep.airdate > today)
    .sort((a, b) => (a.airdate ?? "9999").localeCompare(b.airdate ?? "9999"));
  const windowStart = new Date();
  windowStart.setUTCDate(windowStart.getUTCDate() - 14);
  const freshStart = windowStart.toISOString().slice(0, 10);
  const fresh = aired.filter((ep) => ep.airdate >= freshStart);

  const lines = [];
  lines.push(`${show.name} — брифинг ${today}`);
  lines.push("");
  if (fresh.length) {
    lines.push("Новые серии:");
    for (const ep of fresh) {
      lines.push(`• ${code(ep)} «${ep.name}» — ${ruDate(ep.airdate)}`);
    }
  } else {
    lines.push("За 14 дней новых серий нет.");
    if (aired[0]) {
      lines.push(
        `Последняя: ${code(aired[0])} «${aired[0].name}» (${ruDate(aired[0].airdate)}).`,
      );
    }
  }
  lines.push("");
  if (upcoming[0]) {
    lines.push(
      `Следующая: ${code(upcoming[0])} «${upcoming[0].name}» — ${ruDate(upcoming[0].airdate)}`,
    );
  } else {
    lines.push("Следующая серия пока не объявлена.");
  }
  lines.push("");
  lines.push("Источник: https://api.tvmaze.com/shows/215");
  const text = lines.join("\n");
  console.log(text);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  const payload = await res.json();
  if (!payload.ok) throw new Error(payload.description ?? "Telegram error");
  console.error("telegram: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
