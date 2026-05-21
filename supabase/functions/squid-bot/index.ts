import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://t.me/trust_game_bot/trust_game';

const tg = (method: string, body: Record<string, unknown>) =>
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

serve(async req => {
  const url = new URL(req.url);
  if (url.searchParams.get('setup') === '1') {
    await tg('setMyCommands', {
      commands: [
        { command: 'play', description: 'Играть' },
        { command: 'help', description: 'Как играть' },
      ],
    });
    await tg('setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Играть', web_app: { url: APP_URL } },
    });
    return new Response(JSON.stringify({ ok: true, setup: true }));
  }

  if (req.method !== 'POST') return new Response('ok');

  const update = await req.json();
  const msg = update.message;
  if (msg?.text?.startsWith('/play')) {
    await tg('sendMessage', {
      chat_id: msg.chat.id,
      text: '🎭 Игра на доверие — социальное шоу с выбыванием.',
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть игру', web_app: { url: APP_URL } }]],
      },
    });
  }
  if (msg?.text?.startsWith('/help')) {
    await tg('sendMessage', {
      chat_id: msg.chat.id,
      text: '1. Создай комнату или быстрый матч\n2. Голосуй кого выгнать\n3. Split или Risk\n4. Финал RPS — победа!',
    });
  }
  return new Response(JSON.stringify({ ok: true }));
});
