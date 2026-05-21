import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BOT_NAMES = ['Bot 1', 'Bot 2', 'Bot 3', 'Bot 4', 'Bot 5'];
const IMMEDIATE_HUMANS = 3;
const BOT_FILL_AFTER_MS = 20000;
const MIN_ROOM_PLAYERS = 3;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

serve(async req => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const { user_id, desired = 6 } = await req.json().catch(() => ({}));
  if (!user_id) {
    return json({ error: 'user_id required' }, 400);
  }

  const { data: existingPlayer, error: existingError } = await supabase
    .from('room_players')
    .select('room_id, rooms!inner(id,status,created_at)')
    .eq('user_id', user_id)
    .in('rooms.status', ['waiting', 'playing'])
    .gte('rooms.created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, 500);
  if (existingPlayer?.room_id) {
    const { data: state, error } = await supabase.rpc('get_room_state', { p_room_id: existingPlayer.room_id });
    if (error) return json({ error: error.message }, 500);
    return json(state);
  }

  const { data: queuedUser, error: queuedUserError } = await supabase
    .from('match_queue')
    .select('user_id')
    .eq('user_id', user_id)
    .maybeSingle();
  if (queuedUserError) return json({ error: queuedUserError.message }, 500);

  if (!queuedUser) {
    const { error: enqueueError } = await supabase.rpc('enqueue_matchmaking', {
      p_user_id: user_id,
      p_desired: desired,
    });
    if (enqueueError) return json({ error: enqueueError.message }, 500);
  }

  const { data: queue, error: queueError } = await supabase.from('match_queue').select('*').order('enqueued_at');
  if (queueError) return json({ error: queueError.message }, 500);
  const waitMs = Date.now() - new Date(queue?.[0]?.enqueued_at ?? Date.now()).getTime();
  const shouldStart = (queue?.length ?? 0) >= IMMEDIATE_HUMANS || ((queue?.length ?? 0) > 0 && waitMs > BOT_FILL_AFTER_MS);

  if (shouldStart) {
    const players = queue!.slice(0, Math.min(desired, queue!.length));
    const hostId = players[0]!.user_id;
    const { data: roomRaw } = await supabase.rpc('create_room', {
      p_user_id: hostId,
      p_max_players: desired,
      p_is_private: false,
    });
    if (!roomRaw?.id) return json({ error: 'room_create_failed' }, 500);
    const room = roomRaw as { id: string };
    for (let i = 1; i < players.length; i++) {
      const { error } = await supabase.rpc('join_room', { p_user_id: players[i]!.user_id, p_room_id: room.id });
      if (error) return json({ error: error.message }, 500);
    }
    const botsNeeded = Math.max(0, Math.min(desired, MIN_ROOM_PLAYERS) - players.length);
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
    const { data: state, error } = await supabase.rpc('start_room', { p_room_id: room.id, p_user_id: hostId });
    if (error) return json({ error: error.message }, 500);
    return json(state);
  }

  return json({ queued: true, count: queue?.length ?? 0 });
});
