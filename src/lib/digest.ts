export type TvEpisode = {
  id: number;
  season: number | null;
  number: number | null;
  name: string;
  airdate: string | null;
  airtime: string | null;
  runtime: number | null;
  summary: string;
  image: string | null;
  url: string;
};

export type ShowDigest = {
  id: number;
  name: string;
  nameRu: string;
  status: string;
  network: string | null;
  schedule: string;
  rating: number | null;
  premiered: string | null;
  summary: string;
  poster: string | null;
  officialSite: string | null;
  tvmazeUrl: string;
  fetchedAt: string;
  latestAired: TvEpisode | null;
  nextEpisode: TvEpisode | null;
  recent: TvEpisode[];
  upcoming: TvEpisode[];
  seasonCount: number;
  episodeCount: number;
  currentSeason: number | null;
  seasonEpisodes: TvEpisode[];
};

export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function episodeCode(ep: Pick<TvEpisode, "season" | "number">): string {
  const s = ep.season != null ? String(ep.season).padStart(2, "0") : "??";
  const n = ep.number != null ? String(ep.number).padStart(2, "0") : "??";
  return `S${s}E${n}`;
}

function parseDay(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysSinceAir(airdate: string | null, now = new Date()): number | null {
  const d = parseDay(airdate);
  if (!d) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const air = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((today - air) / 86_400_000);
}

export function isFresh(ep: TvEpisode, now = new Date(), windowDays = 14): boolean {
  const days = daysSinceAir(ep.airdate, now);
  return days != null && days >= 0 && days <= windowDays;
}

export function formatRuDate(iso: string | null): string {
  if (!iso) return "дата не объявлена";
  const d = parseDay(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function buildTelegramText(digest: ShowDigest): string {
  const lines: string[] = [];
  lines.push("Американский папаша — ежедневный брифинг");
  lines.push("");

  const fresh = digest.recent.filter((ep) => isFresh(ep));
  if (fresh.length) {
    lines.push("Новые серии:");
    for (const ep of fresh) {
      lines.push(`• ${episodeCode(ep)} «${ep.name}» — ${formatRuDate(ep.airdate)}`);
    }
  } else {
    lines.push("За последние 14 дней новых серий нет.");
    if (digest.latestAired) {
      lines.push(
        `Последняя вышедшая: ${episodeCode(digest.latestAired)} «${digest.latestAired.name}» (${formatRuDate(digest.latestAired.airdate)}).`,
      );
    }
  }

  lines.push("");
  if (digest.nextEpisode) {
    lines.push(
      `Следующая: ${episodeCode(digest.nextEpisode)} «${digest.nextEpisode.name}» — ${formatRuDate(digest.nextEpisode.airdate)}`,
    );
  } else {
    lines.push("Следующая серия пока не объявлена.");
  }

  lines.push("");
  lines.push("Источник: официальный эфир (TVMaze). Пиратские зеркала не проверяются.");
  return lines.join("\n");
}

export function buildOfficialAppendix(found: { code: string; name: string }[], host: string): string {
  if (!found.length) {
    return `\nНа ${host} свежих серий в открытом тексте нет.`;
  }
  const lines = ["", `На ${host} нашлось:`];
  for (const hit of found) {
    lines.push(`• ${hit.code} «${hit.name}»`);
  }
  return lines.join("\n");
}
