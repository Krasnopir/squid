import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { user_id, coins = 500, stars = 50 } = await req.json();
  const payload = JSON.stringify({ user_id, coins });
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${coins} монет`,
      description: 'Виртуальная валюта для Игры на доверие. Без вывода.',
      payload,
      currency: 'XTR',
      prices: [{ label: 'Монеты', amount: stars }],
    }),
  });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
