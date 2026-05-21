import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BOT_NAMES = ['CryptoNinja', 'DarkLord', 'Shadow', 'NeonFox', 'Viper'];

serve(async req => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { user_id, desired = 6 } = await req.json().catch(() => ({}));
  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers: cors });
  }

  await supabase.rpc('enqueue_matchmaking', { p_user_id: user_id, p_desired: desired });

  const { data: queue } = await supabase.from('match_queue').select('*').order('enqueued_at');
  const waitMs = Date.now() - new Date(queue?.[0]?.enqueued_at ?? Date.now()).getTime();
  const minPlayers = waitMs > 20000 ? 2 : 3;

  if ((queue?.length ?? 0) >= minPlayers) {
    const players = queue!.slice(0, Math.min(desired, queue!.length));
    const hostId = players[0]!.user_id;
    const { data: roomRaw } = await supabase.rpc('create_room', {
      p_user_id: hostId,
      p_max_players: desired,
      p_is_private: false,
    });
    const room = roomRaw as { id: string };
    for (let i = 1; i < players.length; i++) {
      await supabase.rpc('join_room', { p_user_id: players[i]!.user_id, p_room_id: room.id });
    }
    const botsNeeded = Math.max(0, minPlayers - players.length);
    for (let b = 0; b < botsNeeded; b++) {
      const botId = -(b + 1);
      await supabase.from('room_players').insert({
        room_id: room.id,
        user_id: botId,
        display_name: BOT_NAMES[b % BOT_NAMES.length],
        seat: players.length + b,
        is_ready: true,
        is_bot: true,
      });
    }
    await supabase.from('match_queue').delete().in('user_id', players.map(p => p.user_id));
    const { data: state } = await supabase.rpc('start_room', { p_room_id: room.id, p_user_id: hostId });
    return new Response(JSON.stringify(state), { headers: cors });
  }

  return new Response(JSON.stringify({ queued: true, count: queue?.length ?? 0 }), { headers: cors });
});
