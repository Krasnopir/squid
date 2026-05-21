-- Squid Trust Game — core schema
create extension if not exists "pgcrypto";

-- Users
create table if not exists public.users (
  id bigint primary key,
  first_name text not null,
  username text,
  avatar_url text,
  level int not null default 1,
  xp int not null default 0,
  games_played int not null default 0,
  wins int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.balances (
  user_id bigint primary key references public.users(id) on delete cascade,
  coins int not null default 0,
  stars int not null default 0
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id bigint not null references public.users(id),
  kind text not null,
  amount int not null,
  ref_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id bigint not null references public.users(id),
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  max_players int not null default 6 check (max_players between 2 and 8),
  mode text not null default 'classic' check (mode in ('classic', 'duel')),
  pot int not null default 0,
  phase text not null default 'lobby',
  round_index int not null default 0,
  phase_ends_at timestamptz,
  entry_fee int not null default 10,
  winner_id bigint references public.users(id),
  last_eliminated_ids bigint[],
  last_vote_result jsonb,
  last_dilemma_result jsonb,
  last_final_result jsonb,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id bigint not null,
  display_name text not null,
  username text,
  seat int not null,
  is_ready boolean not null default false,
  is_alive boolean not null default true,
  is_bot boolean not null default false,
  vote_target bigint,
  dilemma_choice text check (dilemma_choice in ('split', 'risk')),
  rps_choice text check (rps_choice in ('rock', 'paper', 'scissors')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.match_queue (
  user_id bigint primary key references public.users(id) on delete cascade,
  mode text not null default 'classic',
  desired_players int not null default 6,
  enqueued_at timestamptz not null default now()
);

create table if not exists public.cosmetics (
  id text primary key,
  name text not null,
  category text not null,
  price int not null,
  preview text not null default ''
);

create table if not exists public.user_cosmetics (
  user_id bigint not null references public.users(id),
  cosmetic_id text not null references public.cosmetics(id),
  primary key (user_id, cosmetic_id)
);

insert into public.cosmetics (id, name, category, price, preview) values
  ('neon', 'Неон', 'avatar', 120, '🟣'),
  ('mask', 'Маска', 'avatar', 200, '🎭'),
  ('crown', 'Корона', 'avatar', 500, '👑'),
  ('fire', 'Огонь', 'emote', 80, '🔥'),
  ('skull', 'Череп', 'emote', 150, '💀'),
  ('vip_room', 'VIP комната', 'upgrade', 300, '⭐')
on conflict do nothing;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;

-- RLS
alter table public.users enable row level security;
alter table public.balances enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

create policy users_read on public.users for select using (true);
create policy balances_read on public.balances for select using (true);
create policy rooms_read on public.rooms for select using (true);
create policy room_players_read on public.room_players for select using (true);

-- Helpers
create or replace function public.gen_room_code() returns text language plpgsql as $$
declare c text;
begin
  loop
    c := lpad((floor(random() * 90000) + 10000)::text, 5, '0');
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  return c;
end;
$$;

create or replace function public.get_room_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'id', rm.id::text,
    'code', rm.code,
    'hostId', rm.host_id,
    'status', rm.status,
    'maxPlayers', rm.max_players,
    'mode', rm.mode,
    'pot', rm.pot,
    'phase', rm.phase,
    'roundIndex', rm.round_index,
    'phaseEndsAt', rm.phase_ends_at,
    'entryFee', rm.entry_fee,
    'winnerId', rm.winner_id,
    'lastEliminatedIds', rm.last_eliminated_ids,
    'lastVoteResult', rm.last_vote_result,
    'lastDilemmaResult', rm.last_dilemma_result,
    'lastFinalResult', rm.last_final_result,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', rp.user_id,
        'displayName', rp.display_name,
        'username', rp.username,
        'seat', rp.seat,
        'isReady', rp.is_ready,
        'isAlive', rp.is_alive,
        'isBot', rp.is_bot,
        'voteTarget', rp.vote_target,
        'dilemmaChoice', rp.dilemma_choice,
        'rpsChoice', rp.rps_choice
      ) order by rp.seat)
      from public.room_players rp where rp.room_id = rm.id
    ), '[]'::jsonb)
  ) into r from public.rooms rm where rm.id = p_room_id;
  return r;
end;
$$;

create or replace function public.ensure_user(p_telegram_user jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid bigint := (p_telegram_user->>'id')::bigint;
declare profile jsonb;
begin
  insert into public.users (id, first_name, username)
  values (uid, p_telegram_user->>'first_name', p_telegram_user->>'username')
  on conflict (id) do update set first_name = excluded.first_name, username = excluded.username;
  insert into public.balances (user_id, coins) values (uid, 0)
  on conflict (user_id) do nothing;
  if not exists (select 1 from public.transactions where user_id = uid and kind = 'signup_bonus') then
    update public.balances set coins = coins + 50 where user_id = uid;
    insert into public.transactions (user_id, kind, amount) values (uid, 'signup_bonus', 50);
  end if;
  select jsonb_build_object(
    'id', u.id,
    'firstName', u.first_name,
    'username', u.username,
    'level', u.level,
    'xp', u.xp,
    'xpToNext', 100,
    'gamesPlayed', u.games_played,
    'wins', u.wins,
    'globalRank', 9999,
    'coins', b.coins,
    'stars', b.stars
  ) into profile
  from public.users u
  join public.balances b on b.user_id = u.id
  where u.id = uid;
  return profile;
end;
$$;

create or replace function public.create_room(p_user_id bigint, p_max_players int, p_is_private boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rid uuid;
declare code text := public.gen_room_code();
declare fee int := 10;
begin
  update public.balances set coins = coins - fee where user_id = p_user_id and coins >= fee;
  if not found then raise exception 'insufficient_coins'; end if;
  insert into public.rooms (code, host_id, max_players, is_private, mode)
  values (code, p_user_id, p_max_players, p_is_private, case when p_max_players <= 2 then 'duel' else 'classic' end)
  returning id into rid;
  insert into public.room_players (room_id, user_id, display_name, username, seat, is_ready)
  select rid, u.id, u.first_name, u.username, 0, true from public.users u where u.id = p_user_id;
  update public.rooms set pot = pot + fee where id = rid;
  return public.get_room_state(rid);
end;
$$;

create or replace function public.join_room(p_user_id bigint, p_code text default null, p_room_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rid uuid;
declare fee int;
declare current_count int;
declare max_count int;
declare room_status text;
begin
  if p_room_id is not null then rid := p_room_id;
  else select id into rid from public.rooms where code = p_code;
  end if;
  if rid is null then raise exception 'room_not_found'; end if;
  if exists (select 1 from public.room_players where room_id = rid and user_id = p_user_id) then
    return public.get_room_state(rid);
  end if;
  select entry_fee, max_players, status into fee, max_count, room_status from public.rooms where id = rid;
  if room_status <> 'waiting' then raise exception 'room_started'; end if;
  select count(*) into current_count from public.room_players where room_id = rid;
  if current_count >= max_count then raise exception 'room_full'; end if;
  update public.balances set coins = coins - fee where user_id = p_user_id and coins >= fee;
  if not found then raise exception 'insufficient_coins'; end if;
  insert into public.room_players (room_id, user_id, display_name, username, seat)
  select rid, u.id, u.first_name, u.username,
    coalesce((select max(seat)+1 from public.room_players where room_id = rid), 0)
  from public.users u where u.id = p_user_id
  on conflict do nothing;
  update public.rooms set pot = pot + fee where id = rid;
  select count(*) into current_count from public.room_players where room_id = rid;
  if current_count >= 2 then
    update public.rooms set phase_ends_at = now() + interval '30 seconds' where id = rid and status = 'waiting';
  end if;
  return public.get_room_state(rid);
end;
$$;

create or replace function public.set_ready(p_room_id uuid, p_user_id bigint, p_ready boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.room_players set is_ready = p_ready where room_id = p_room_id and user_id = p_user_id;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.start_room(p_room_id uuid, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cnt int;
declare ph text;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and host_id = p_user_id) then
    raise exception 'not_host';
  end if;
  select count(*) into cnt from public.room_players where room_id = p_room_id;
  if cnt < 2 then raise exception 'not_enough_players'; end if;
  ph := case when (select mode from public.rooms where id = p_room_id) = 'duel' then 'finals' else 'vote' end;
  update public.rooms set status = 'playing', phase = ph, round_index = 0,
    phase_ends_at = now() + interval '30 seconds'
  where id = p_room_id;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_vote(p_room_id uuid, p_user_id bigint, p_target_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.room_players set vote_target = p_target_id
  where room_id = p_room_id and user_id = p_user_id and is_alive;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_dilemma(p_room_id uuid, p_user_id bigint, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.room_players set dilemma_choice = p_choice
  where room_id = p_room_id and user_id = p_user_id and is_alive;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_rps(p_room_id uuid, p_user_id bigint, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.room_players set rps_choice = p_choice
  where room_id = p_room_id and user_id = p_user_id and is_alive;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.enqueue_matchmaking(p_user_id bigint, p_desired int default 6)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.match_queue (user_id, desired_players) values (p_user_id, p_desired)
  on conflict (user_id) do update set enqueued_at = now(), desired_players = p_desired;
  return jsonb_build_object('queued', true);
end;
$$;

grant execute on function public.get_room_state(uuid) to anon, authenticated, service_role;
grant execute on function public.ensure_user(jsonb) to anon, authenticated, service_role;
grant execute on function public.create_room(bigint, int, boolean) to anon, authenticated, service_role;
grant execute on function public.join_room(bigint, text, uuid) to anon, authenticated, service_role;
grant execute on function public.set_ready(uuid, bigint, boolean) to anon, authenticated, service_role;
grant execute on function public.start_room(uuid, bigint) to anon, authenticated, service_role;
grant execute on function public.submit_vote(uuid, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.submit_dilemma(uuid, bigint, text) to anon, authenticated, service_role;
grant execute on function public.submit_rps(uuid, bigint, text) to anon, authenticated, service_role;
grant execute on function public.enqueue_matchmaking(bigint, int) to anon, authenticated, service_role;
