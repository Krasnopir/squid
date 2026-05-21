# Статус деплоя

## Готово

| Шаг | Статус |
|-----|--------|
| Git push `main` → github.com/Krasnopir/squid | ✅ |
| Supabase миграции 001–002 | ✅ (ты прогнал) |
| Edge functions + webhook `@bro_squid_bot` | ✅ `./deploy.sh` |
| `.env.local` + service_role | ✅ |
| GitHub Actions → Pages workflow | ✅ (после push задеплоит) |

**Live URLs:**
- Frontend (после Pages): https://krasnopir.github.io/squid/
- Supabase: https://bfenwwuspuqmktvfjtxb.supabase.co
- Bot: https://t.me/bro_squid_bot

## С тебя — осталось 3 шага

### 1. GitHub Pages (один раз в репо)

Settings → Pages → Source: **GitHub Actions** (не branch deploy).

После следующего push workflow сам соберёт и выложит.

### 2. BotFather — Mini App

У `@bro_squid_bot`:

1. `/newapp` (если ещё нет) → short name: **`app`**
2. **Web App URL:** `https://krasnopir.github.io/squid/`
3. Сохрани

Кнопка меню бота уже настроена на этот URL через `deploy.sh`.

### 3. Cron `room-tick`

Supabase Dashboard → Edge Functions → **room-tick** → **Schedules** → Create:

- Cron: `* * * * *` (каждую минуту)
- Или в SQL: см. Dashboard docs

Без этого таймеры фаз в live-матчах не тикают сами.

## Опционально позже

- `VITE_TON_SERVICE_WALLET` + TonCenter — пополнение TON
- Отдельный **anon** JWT, если publishable key не заработает в старом SDK (в Dashboard → API → Legacy anon key)

## Безопасность

- **Не коммить** `.env.local` (в `.gitignore` через `*.local`)
- Токен бота и `service_role` — только в секретах Supabase / локально
- Если токен засветился в чате — перевыпусти в BotFather `/revoke`
