# Что уже сделано / что нужно с тебя

## Уже настроено локально

- `.env.local` — Supabase URL + publishable key, бот `@bro_squid_bot`
- SSH: `github-squid` → `~/.ssh/id_ed25519_github_squid` (новый ключ, старые не трогали)
- Код: `BOT_USERNAME=bro_squid_bot`, `MINI_APP_NAME=app` (см. ниже)

## С тебя — обязательно

### 1. GitHub Deploy key

См. [GITHUB_DEPLOY_KEY.md](./GITHUB_DEPLOY_KEY.md) — вставь публичный ключ в репо.

### 2. Supabase Dashboard

Проект: `bfenwwuspuqmktvfjtxb`

1. **SQL Editor** — выполни по порядку:
   - `supabase/migrations/001_squid_core.sql`
   - `supabase/migrations/002_advance_phase.sql`
2. **Settings → API** — скопируй **`service_role`** (secret) в `.env.local` → `SUPABASE_SERVICE_ROLE_KEY=`
3. **Database → Replication** — убедись, что Realtime включён для `rooms`, `room_players` (в 001 уже `alter publication`)

### 3. Telegram BotFather

1. `/newapp` у `@bro_squid_bot` — создай Mini App, short name (например `app` или `trust`)
2. URL Web App — пока Vercel/хостинг или `https://localhost` для теста
3. Если short name **не** `app` — поправь в `.env.local`:
   - `APP_URL=https://t.me/bro_squid_bot/ТВОЙ_SHORT_NAME`
   - `src/lib/telegram.ts` → `MINI_APP_NAME`

### 4. Деплой edge functions (после service_role)

```bash
cd squid
# заполни SUPABASE_SERVICE_ROLE_KEY в .env.local
./deploy.sh
```

### 5. Cron для таймеров комнат

Supabase Dashboard → Edge Functions → `room-tick` → Schedule: `*/1 * * * *` (каждую минуту)  
или pg_cron, если включишь.

### 6. Хостинг фронта

Собери `npm run build`, залей `dist/` на Vercel/Cloudflare/nginx.  
Обнови URL Mini App в BotFather на прод-URL.

## Опционально позже

- `VITE_TON_SERVICE_WALLET` + TonCenter — пополнение TON
- Отдельный **anon** JWT, если publishable key не заработает в старом SDK (в Dashboard → API → Legacy anon key)

## Безопасность

- **Не коммить** `.env.local` (в `.gitignore` через `*.local`)
- Токен бота и `service_role` — только в секретах Supabase / локально
- Если токен засветился в чате — перевыпусти в BotFather `/revoke`
