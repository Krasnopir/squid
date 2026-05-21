alter table public.rooms
  add column if not exists last_eliminated_ids bigint[],
  add column if not exists last_vote_result jsonb,
  add column if not exists last_dilemma_result jsonb,
  add column if not exists last_final_result jsonb;
