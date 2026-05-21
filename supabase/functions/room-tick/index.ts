import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: waitingRooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', 'waiting');

  const { data: activeRooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('status', 'playing')
    .lt('phase_ends_at', new Date().toISOString());

  const rooms = [...(waitingRooms ?? []), ...(activeRooms ?? [])];
  const ids = new Set<string>();
  for (const r of rooms) {
    if (ids.has(r.id)) continue;
    ids.add(r.id);
    await supabase.rpc('advance_room_phase', { p_room_id: r.id });
  }

  return new Response(JSON.stringify({ advanced: ids.size }));
});
