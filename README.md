# Папаша — брифинг

MIT. Трекер серий *American Dad!* по **официальному эфиру** [TVMaze](https://www.tvmaze.com/shows/215/american-dad) + опциональная отправка в Telegram.

Пиратские каталоги не поддерживаются.

## Что умеет

- Живой JSON с TVMaze (`/shows/215` и `/episodes?specials=1`) — даты не зашиты в код.
- CLI-брифинг на сегодня: свежие серии за 14 дней + следующая дата.
- Веб-кабинет (TanStack Start / React): дайджест сезона, Telegram-панель, официальный сайт.
- Токен бота только в env / UI, в репозиторий не коммитится.

## Быстрый старт (CLI)

Нужен Node 18+.

```bash
node watch.mjs
```

С Telegram:

```bash
TELEGRAM_BOT_TOKEN='123:ABC' TELEGRAM_CHAT_ID='123456' node watch.mjs
```

Cron раз в сутки:

```cron
0 9 * * * TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... node /path/to/watch.mjs
```

## Технодемка (2026-09-14)

```
American Dad! — брифинг 2026-09-14

Новые серии:
• S21E12 «400?!» — 13 сентября 2026 г.
• S21E13 «Tales from the Outer Frontier» — 13 сентября 2026 г.

Следующая серия пока не объявлена.

Источник: https://api.tvmaze.com/shows/215
```

## Веб-кабинет

```bash
npm install
npm run dev
```

В UI: токен бота (@BotFather) и chat id.

## Источник данных

- Шоу: https://api.tvmaze.com/shows/215
- Серии: https://api.tvmaze.com/shows/215/episodes?specials=1

## Лицензия

[MIT](./LICENSE)
