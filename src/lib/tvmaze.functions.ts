import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type ShowDigest,
  type TvEpisode,
  stripHtml,
} from "./digest";

const SHOW_ID = 215;

type MazeImage = { medium?: string; original?: string } | null;
type MazeEpisode = {
  id: number;
  name: string;
  season: number | null;
  number: number | null;
  airdate: string | null;
  airtime: string | null;
  runtime: number | null;
  summary: string | null;
  url: string;
  image: MazeImage;
  type?: string;
};
type MazeShow = {
  id: number;
  name: string;
  status: string;
  officialSite: string | null;
  url: string;
  premiered: string | null;
  summary: string | null;
  rating: { average: number | null } | null;
  network: { name: string } | null;
  webChannel: { name: string } | null;
  schedule: { time: string; days: string[] } | null;
  image: MazeImage;
};

function mapEpisode(ep: MazeEpisode): TvEpisode {
  return {
    id: ep.id,
    season: ep.season,
    number: ep.number,
    name: ep.name,
    airdate: ep.airdate || null,
    airtime: ep.airtime || null,
    runtime: ep.runtime,
    summary: stripHtml(ep.summary),
    image: ep.image?.original ?? ep.image?.medium ?? null,
    url: ep.url,
  };
}

async function fetchJson<T>(url: string, force: boolean): Promise<T> {
  const target = force ? `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}` : url;
  const res = await fetch(target, {
    headers: {
      Accept: "application/json",
      ...(force ? { "Cache-Control": "no-cache" } : {}),
    },
    cache: force ? "no-store" : "default",
  });
  if (!res.ok) {
    throw new Error(`TVMaze ${res.status}`);
  }
  return (await res.json()) as T;
}

async function loadDigest(force: boolean): Promise<ShowDigest> {
  const [show, rawEpisodes] = await Promise.all([
    fetchJson<MazeShow>(`https://api.tvmaze.com/shows/${SHOW_ID}`, force),
    fetchJson<MazeEpisode[]>(
      `https://api.tvmaze.com/shows/${SHOW_ID}/episodes?specials=1`,
      force,
    ),
  ]);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const episodes = rawEpisodes
    .filter((ep) => ep.type !== "insignificant_special")
    .map(mapEpisode);

  const numbered = episodes.filter((ep) => ep.number != null);
  const aired = numbered
    .filter((ep) => ep.airdate && ep.airdate <= todayIso)
    .sort((a, b) => (b.airdate ?? "").localeCompare(a.airdate ?? ""));
  const upcoming = numbered
    .filter((ep) => !ep.airdate || ep.airdate > todayIso)
    .sort((a, b) => (a.airdate ?? "9999").localeCompare(b.airdate ?? "9999"));

  const seasons = new Set(
    numbered.map((ep) => ep.season).filter((s): s is number => s != null),
  );
  const currentSeason = seasons.size
    ? Math.max(...Array.from(seasons))
    : null;
  const seasonEpisodes = numbered
    .filter((ep) => ep.season === currentSeason)
    .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));

  const days = show.schedule?.days ?? [];
  const time = show.schedule?.time;
  const dayMap: Record<string, string> = {
    Monday: "пн",
    Tuesday: "вт",
    Wednesday: "ср",
    Thursday: "чт",
    Friday: "пт",
    Saturday: "сб",
    Sunday: "вс",
  };
  const schedule = [days.map((d) => dayMap[d] ?? d).join(", "), time]
    .filter(Boolean)
    .join(" · ");

  return {
    id: show.id,
    name: show.name,
    nameRu: "Американский папаша",
    status: show.status,
    network: show.network?.name ?? show.webChannel?.name ?? null,
    schedule: schedule || "расписание не указано",
    rating: show.rating?.average ?? null,
    premiered: show.premiered,
    summary: stripHtml(show.summary),
    poster: show.image?.original ?? show.image?.medium ?? null,
    officialSite: show.officialSite,
    tvmazeUrl: show.url,
    fetchedAt: new Date().toISOString(),
    latestAired: aired[0] ?? null,
    nextEpisode: upcoming[0] ?? null,
    recent: aired.slice(0, 12),
    upcoming: upcoming.slice(0, 8),
    seasonCount: seasons.size,
    episodeCount: numbered.length,
    currentSeason,
    seasonEpisodes,
  };
}

export const getShowDigest = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShowDigest> => loadDigest(false),
);

export const refreshShowDigest = createServerFn({ method: "POST" }).handler(
  async (): Promise<ShowDigest> => loadDigest(true),
);

const telegramInput = z.object({
  botToken: z.string().min(20).max(120),
  chatId: z.string().min(1).max(64),
  text: z.string().min(1).max(3900),
});

export const sendTelegramMessage = createServerFn({ method: "POST" })
  .validator(telegramInput)
  .handler(async ({ data }) => {
    const token = data.botToken.trim();
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      throw new Error("Не похоже на токен Telegram-бота.");
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: data.chatId.trim(),
        text: data.text,
        disable_web_page_preview: true,
      }),
    });
    const payload = (await res.json()) as {
      ok: boolean;
      description?: string;
    };
    if (!payload.ok) {
      throw new Error(payload.description ?? "Telegram не принял сообщение.");
    }
    return { ok: true as const };
  });
