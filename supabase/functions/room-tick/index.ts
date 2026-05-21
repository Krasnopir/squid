import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .in('status', ['waiting', 'playing'])
    .lt('phase_ends_at', new Date().toISOString());

  for (const r of rooms ?? []) {
    await supabase.rpc('advance_room_phase', { p_room_id: r.id });
  }

  return new Response(JSON.stringify({ advanced: (rooms ?? []).length }));
});
