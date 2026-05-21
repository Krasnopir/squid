import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const verifyInitData = (initData: string, botToken: string): boolean => {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return computedHash === hash;
  } catch {
    return false;
  }
};

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { initData } = await req.json().catch(() => ({ initData: '' }));
  if (!initData || !verifyInitData(initData, BOT_TOKEN)) {
    return new Response(JSON.stringify({ valid: false }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user') ?? 'null');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  await supabase.rpc('ensure_user', { p_telegram_user: user });
  return new Response(JSON.stringify({ valid: true, user }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
