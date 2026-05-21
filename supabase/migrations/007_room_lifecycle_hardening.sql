-- Harden room lifecycle: no pre-start charges, leave/heartbeat, AFK, bot autofill.

do $$
declare constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.rooms'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%'
    and pg_get_constraintdef(oid) like '%waiting%';

  if constraint_name is not null then
    execute format('alter table public.rooms drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.rooms
  add constraint rooms_status_check
  check (status in ('waiting', 'playing', 'finished', 'cancelled', 'expired'));

alter table public.rooms
  add column if not exists started_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists min_players int not null default 2;

alter table public.room_players
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists left_at timestamptz,
  add column if not exists afk_strikes int not null default 0;

alter table public.match_queue
  add column if not exists entry_fee int not null default 10;

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
        'rpsChoice', rp.rps_choice,
        'leftAt', rp.left_at,
        'lastSeenAt', rp.last_seen_at,
        'afkStrikes', rp.afk_strikes
      ) order by rp.seat)
      from public.room_players rp
      where rp.room_id = rm.id and rp.left_at is null
    ), '[]'::jsonb)
  ) into r from public.rooms rm where rm.id = p_room_id;
  return r;
end;
$$;

create or replace function public.enqueue_matchmaking(p_user_id bigint, p_desired int default 6, p_entry_fee int default 10)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.match_queue (user_id, desired_players, entry_fee)
  values (p_user_id, p_desired, p_entry_fee)
  on conflict (user_id) do update
    set desired_players = excluded.desired_players,
        entry_fee = excluded.entry_fee;
  return jsonb_build_object('queued', true);
end;
$$;

create or replace function public.create_room(
  p_user_id bigint,
  p_max_players int,
  p_is_private boolean default false,
  p_entry_fee int default 10
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare rid uuid;
declare code text := public.gen_room_code();
declare fee int := greatest(5, least(coalesce(p_entry_fee, 10), 20));
begin
  if p_max_players < 2 or p_max_players > 8 then raise exception 'bad_room_size'; end if;
  if not exists (select 1 from public.balances where user_id = p_user_id and coins >= fee) then
    raise exception 'insufficient_coins';
  end if;

  insert into public.rooms (code, host_id, max_players, is_private, mode, entry_fee, pot, expires_at)
  values (
    code,
    p_user_id,
    p_max_players,
    p_is_private,
    case when p_max_players <= 2 then 'duel' else 'classic' end,
    fee,
    0,
    now() + interval '15 minutes'
  )
  returning id into rid;

  insert into public.room_players (room_id, user_id, display_name, username, seat, is_ready, last_seen_at)
  select rid, u.id, u.first_name, u.username, 0, true, now()
  from public.users u where u.id = p_user_id;

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

  if exists (select 1 from public.room_players where room_id = rid and user_id = p_user_id and left_at is null) then
    update public.room_players set last_seen_at = now() where room_id = rid and user_id = p_user_id;
    return public.get_room_state(rid);
  end if;

  select entry_fee, max_players, status into fee, max_count, room_status from public.rooms where id = rid;
  if room_status <> 'waiting' then raise exception 'room_started'; end if;
  if not exists (select 1 from public.balances where user_id = p_user_id and coins >= fee) then
    raise exception 'insufficient_coins';
  end if;

  select count(*) into current_count from public.room_players where room_id = rid and left_at is null;
  if current_count >= max_count then raise exception 'room_full'; end if;

  insert into public.room_players (room_id, user_id, display_name, username, seat, last_seen_at)
  select rid, u.id, u.first_name, u.username,
    coalesce((select max(seat)+1 from public.room_players where room_id = rid), 0),
    now()
  from public.users u where u.id = p_user_id
  on conflict (room_id, user_id) do update
    set left_at = null,
        is_ready = false,
        is_alive = true,
        vote_target = null,
        dilemma_choice = null,
        rps_choice = null,
        last_seen_at = now();

  select count(*) into current_count from public.room_players where room_id = rid and left_at is null;
  if current_count >= 2 then
    update public.rooms
    set phase_ends_at = now() + interval '30 seconds',
        expires_at = now() + interval '15 minutes'
    where id = rid and status = 'waiting';
  end if;

  return public.get_room_state(rid);
end;
$$;

create or replace function public.heartbeat_room(p_room_id uuid, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  update public.room_players
  set last_seen_at = now()
  where room_id = p_room_id and user_id = p_user_id and left_at is null;
  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.leave_room(p_room_id uuid, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare active_count int;
declare next_host bigint;
declare rm public.rooms%rowtype;
begin
  select * into rm from public.rooms where id = p_room_id for update;
  if rm.id is null then raise exception 'room_not_found'; end if;

  if rm.status = 'waiting' then
    update public.room_players
    set left_at = now(), is_ready = false
    where room_id = p_room_id and user_id = p_user_id and left_at is null;

    select count(*) into active_count from public.room_players where room_id = p_room_id and left_at is null;
    if active_count = 0 then
      update public.rooms set status = 'cancelled', cancelled_at = now(), phase_ends_at = null where id = p_room_id;
    else
      if rm.host_id = p_user_id then
        select user_id into next_host from public.room_players where room_id = p_room_id and left_at is null order by seat limit 1;
        update public.rooms set host_id = next_host where id = p_room_id;
      end if;
      if active_count < 2 then
        update public.rooms set phase_ends_at = null where id = p_room_id;
      end if;
    end if;
  elsif rm.status = 'playing' then
    update public.room_players
    set left_at = now(), afk_strikes = afk_strikes + 1
    where room_id = p_room_id and user_id = p_user_id and left_at is null;
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.start_room(p_room_id uuid, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rm public.rooms%rowtype;
  cnt int;
  human_count int;
  charged_count int;
  ph text;
begin
  select * into rm from public.rooms where id = p_room_id for update;
  if rm.id is null then raise exception 'room_not_found'; end if;
  if rm.host_id <> p_user_id then raise exception 'not_host'; end if;
  if rm.status <> 'waiting' then return public.get_room_state(p_room_id); end if;

  update public.room_players
  set left_at = now(), is_ready = false
  where room_id = p_room_id
    and left_at is null
    and not is_bot
    and last_seen_at < now() - interval '45 seconds';

  update public.room_players rp
  set left_at = now(), is_ready = false
  where rp.room_id = p_room_id
    and rp.left_at is null
    and not rp.is_bot
    and not exists (
      select 1 from public.balances b
      where b.user_id = rp.user_id and b.coins >= rm.entry_fee
    );

  select count(*) into cnt from public.room_players where room_id = p_room_id and left_at is null;
  if cnt < 2 then
    update public.rooms set phase_ends_at = null where id = p_room_id;
    raise exception 'not_enough_players';
  end if;

  select count(*) into human_count
  from public.room_players
  where room_id = p_room_id and left_at is null and not is_bot;

  update public.balances b
  set coins = b.coins - rm.entry_fee
  where b.user_id in (
    select user_id from public.room_players
    where room_id = p_room_id and left_at is null and not is_bot
  )
  and b.coins >= rm.entry_fee;
  get diagnostics charged_count = row_count;

  if charged_count <> human_count then
    raise exception 'insufficient_coins';
  end if;

  insert into public.transactions (user_id, kind, amount, ref_id)
  select user_id, 'room_entry', -rm.entry_fee, p_room_id::text
  from public.room_players
  where room_id = p_room_id and left_at is null and not is_bot;

  ph := case when rm.mode = 'duel' or cnt <= 2 then 'finals' else 'vote' end;
  update public.rooms set
    status = 'playing',
    phase = ph,
    round_index = 0,
    started_at = now(),
    pot = rm.entry_fee * charged_count,
    phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' else interval '30 seconds' end,
    last_eliminated_ids = null,
    last_vote_result = null,
    last_dilemma_result = null,
    last_final_result = null
  where id = p_room_id;

  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.resolve_if_single_alive(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare alive_cnt int;
declare winner bigint;
begin
  select count(*), min(user_id) into alive_cnt, winner
  from public.room_players
  where room_id = p_room_id and is_alive and left_at is null;

  if alive_cnt <= 1 then
    update public.rooms
    set status = 'finished',
        phase = 'results',
        winner_id = winner,
        phase_ends_at = now() + interval '60 seconds'
    where id = p_room_id and status = 'playing';
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.advance_room_phase(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rm public.rooms%rowtype;
  alive_cnt int;
  voted_cnt int;
  max_votes int;
  leader bigint;
  leaders int;
  elim_ids bigint[];
  ph text;
  reason text;
  split_cnt int;
  risk_cnt int;
  outcome text;
  p1 bigint;
  p2 bigint;
  c1 text;
  c2 text;
  final_winner bigint;
  is_draw boolean;
begin
  select * into rm from public.rooms where id = p_room_id for update;
  if rm.id is null then raise exception 'room_not_found'; end if;

  if rm.status = 'waiting' then
    update public.room_players
    set left_at = now(), is_ready = false
    where room_id = p_room_id
      and left_at is null
      and not is_bot
      and last_seen_at < now() - interval '45 seconds';

    select count(*) into alive_cnt from public.room_players where room_id = p_room_id and left_at is null;
    if alive_cnt = 0 or (rm.expires_at is not null and rm.expires_at <= now()) then
      update public.rooms set status = 'expired', cancelled_at = now(), phase_ends_at = null where id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;

    if alive_cnt < 2 then
      update public.rooms set phase_ends_at = null where id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;

    if rm.phase_ends_at is not null and rm.phase_ends_at <= now() then
      return public.start_room(p_room_id, rm.host_id);
    end if;

    return public.get_room_state(p_room_id);
  end if;

  if rm.status != 'playing' then return public.get_room_state(p_room_id); end if;
  if rm.phase_ends_at is not null and rm.phase_ends_at > now() then
    return public.get_room_state(p_room_id);
  end if;

  if public.resolve_if_single_alive(p_room_id) then
    return public.get_room_state(p_room_id);
  end if;

  select count(*) into alive_cnt
  from public.room_players
  where room_id = p_room_id and is_alive and left_at is null;

  if rm.phase = 'vote' then
    update public.room_players rp
    set vote_target = rp.user_id,
        afk_strikes = rp.afk_strikes + case when rp.is_bot then 0 else 1 end
    where rp.room_id = p_room_id
      and rp.is_alive
      and rp.left_at is null
      and rp.vote_target is null
      and not rp.is_bot;

    update public.room_players bot
    set vote_target = coalesce((
      select target.user_id
      from public.room_players target
      where target.room_id = p_room_id
        and target.is_alive
        and target.left_at is null
        and target.user_id <> bot.user_id
      order by random()
      limit 1
    ), bot.user_id)
    where bot.room_id = p_room_id
      and bot.is_alive
      and bot.left_at is null
      and bot.is_bot
      and bot.vote_target is null;

    update public.room_players
    set is_alive = false
    where room_id = p_room_id and is_alive and afk_strikes >= 2;

    if public.resolve_if_single_alive(p_room_id) then
      return public.get_room_state(p_room_id);
    end if;

    select count(*) into voted_cnt
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null and vote_target is not null;

    select count(*) into alive_cnt
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null;

    if voted_cnt < ceil(alive_cnt::numeric / 2) then
      reason := 'low_turnout';
      select coalesce(array_agg(user_id), '{}') into elim_ids
      from (
        select user_id from public.room_players
        where room_id = p_room_id and is_alive and left_at is null
        order by random()
        limit least(2, greatest(0, alive_cnt - 2))
      ) t;
    else
      select vote_target, count(*) into leader, max_votes
      from public.room_players
      where room_id = p_room_id and is_alive and left_at is null and vote_target is not null
      group by vote_target
      order by count(*) desc
      limit 1;

      select count(*) into leaders from (
        select vote_target
        from public.room_players
        where room_id = p_room_id and is_alive and left_at is null and vote_target is not null
        group by vote_target
        having count(*) = max_votes
      ) t;

      if leaders > 1 then
        reason := 'tie';
        select coalesce(array_agg(user_id), '{}') into elim_ids
        from (
          select vote_target as user_id
          from public.room_players
          where room_id = p_room_id and is_alive and left_at is null and vote_target is not null
          group by vote_target
          having count(*) = max_votes
          order by random()
          limit least(2, greatest(0, alive_cnt - 2))
        ) t;
      else
        reason := 'majority';
        elim_ids := array[leader];
      end if;
    end if;

    update public.room_players set is_alive = false
    where room_id = p_room_id and user_id = any(elim_ids);

    update public.rooms set
      phase = 'reveal_elimination',
      phase_ends_at = now() + interval '3 seconds',
      last_eliminated_ids = elim_ids,
      last_vote_result = jsonb_build_object(
        'reason', reason,
        'tally', coalesce((
          select jsonb_agg(jsonb_build_object('userId', vote_target, 'votes', votes) order by votes desc)
          from (
            select vote_target, count(*) votes
            from public.room_players
            where room_id = p_room_id and vote_target is not null
            group by vote_target
          ) tally
        ), '[]'::jsonb)
      )
    where id = p_room_id;

    update public.room_players set vote_target = null where room_id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'reveal_elimination' then
    select count(*) into alive_cnt
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null;

    if alive_cnt <= 2 then ph := 'finals';
    elsif rm.round_index = 0 and alive_cnt >= 3 then ph := 'dilemma';
    else ph := 'vote';
    end if;

    update public.rooms set phase = ph, round_index = rm.round_index + 1,
      phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' when 'dilemma' then interval '25 seconds' else interval '30 seconds' end,
      last_eliminated_ids = null
    where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'dilemma' then
    update public.room_players
    set dilemma_choice = 'risk',
        afk_strikes = afk_strikes + case when is_bot then 0 else 1 end
    where room_id = p_room_id
      and is_alive
      and left_at is null
      and dilemma_choice is null;

    update public.room_players
    set is_alive = false
    where room_id = p_room_id and is_alive and afk_strikes >= 2;

    if public.resolve_if_single_alive(p_room_id) then
      return public.get_room_state(p_room_id);
    end if;

    select count(*) filter (where dilemma_choice = 'split'),
      count(*) filter (where dilemma_choice = 'risk' or dilemma_choice is null)
    into split_cnt, risk_cnt
    from public.room_players where room_id = p_room_id and is_alive and left_at is null;

    outcome := case when split_cnt > risk_cnt then 'split' else 'risk' end;
    update public.rooms set
      phase = 'dilemma_reveal',
      phase_ends_at = now() + interval '3 seconds',
      last_dilemma_result = jsonb_build_object(
        'outcome', outcome,
        'splitCount', split_cnt,
        'riskCount', risk_cnt,
        'endMatch', outcome = 'split'
      )
    where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'dilemma_reveal' then
    if rm.last_dilemma_result->>'outcome' = 'split' then
      update public.rooms set status = 'finished', phase = 'results', phase_ends_at = now() + interval '60 seconds'
      where id = p_room_id;
      update public.room_players set dilemma_choice = null where room_id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;

    select count(*) into alive_cnt
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null;
    ph := case when alive_cnt <= 2 then 'finals' else 'vote' end;

    update public.rooms set
      phase = ph,
      round_index = rm.round_index + 1,
      phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' else interval '30 seconds' end,
      last_dilemma_result = null
    where id = p_room_id;
    update public.room_players set dilemma_choice = null where room_id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'finals' then
    select user_id into p1
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null
    order by seat limit 1;
    select user_id into p2
    from public.room_players
    where room_id = p_room_id and is_alive and left_at is null and user_id <> p1
    order by seat limit 1;

    if p2 is null then
      update public.rooms set status = 'finished', phase = 'results', winner_id = p1,
        phase_ends_at = now() + interval '60 seconds' where id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;

    update public.room_players
    set afk_strikes = afk_strikes + 1
    where room_id = p_room_id and is_alive and left_at is null and not is_bot and rps_choice is null;

    select coalesce(rps_choice, (array['rock','paper','scissors'])[floor(random() * 3 + 1)::int])
      into c1 from public.room_players where room_id = p_room_id and user_id = p1;
    select coalesce(rps_choice, (array['rock','paper','scissors'])[floor(random() * 3 + 1)::int])
      into c2 from public.room_players where room_id = p_room_id and user_id = p2;
    is_draw := c1 = c2;
    final_winner := case
      when is_draw then null
      when (c1 = 'rock' and c2 = 'scissors') or (c1 = 'paper' and c2 = 'rock') or (c1 = 'scissors' and c2 = 'paper') then p1
      else p2
    end;

    update public.room_players
    set rps_choice = case when user_id = p1 then c1 when user_id = p2 then c2 else rps_choice end
    where room_id = p_room_id;

    update public.rooms set
      phase = 'finals_reveal',
      phase_ends_at = now() + interval '3 seconds',
      last_final_result = jsonb_build_object(
        'choices', jsonb_build_array(
          jsonb_build_object('userId', p1, 'choice', c1),
          jsonb_build_object('userId', p2, 'choice', c2)
        ),
        'winnerId', final_winner,
        'draw', is_draw
      )
    where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'finals_reveal' then
    if coalesce((rm.last_final_result->>'draw')::boolean, false) then
      update public.rooms set phase = 'finals', phase_ends_at = now() + interval '15 seconds'
      where id = p_room_id;
      update public.room_players set rps_choice = null where room_id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;
    update public.rooms set status = 'finished', phase = 'results',
      winner_id = (rm.last_final_result->>'winnerId')::bigint,
      phase_ends_at = now() + interval '60 seconds'
    where id = p_room_id;
    update public.room_players set rps_choice = null where room_id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_vote(p_room_id uuid, p_user_id bigint, p_target_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare all_done boolean;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and status = 'playing' and phase = 'vote') then
    raise exception 'wrong_phase';
  end if;
  if not exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = p_target_id and is_alive and left_at is null
  ) then
    raise exception 'bad_target';
  end if;

  update public.room_players
  set vote_target = p_target_id, last_seen_at = now()
  where room_id = p_room_id and user_id = p_user_id and is_alive and left_at is null;

  update public.room_players bot
  set vote_target = coalesce((
    select target.user_id
    from public.room_players target
    where target.room_id = p_room_id
      and target.is_alive
      and target.left_at is null
      and target.user_id <> bot.user_id
    order by random()
    limit 1
  ), bot.user_id)
  where bot.room_id = p_room_id and bot.is_alive and bot.left_at is null and bot.is_bot and bot.vote_target is null;

  select bool_and(vote_target is not null) into all_done
  from public.room_players
  where room_id = p_room_id and is_alive and left_at is null;

  if all_done then
    update public.rooms set phase_ends_at = now() where id = p_room_id and phase = 'vote';
    return public.advance_room_phase(p_room_id);
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_dilemma(p_room_id uuid, p_user_id bigint, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare all_done boolean;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and status = 'playing' and phase = 'dilemma') then
    raise exception 'wrong_phase';
  end if;
  if p_choice not in ('split', 'risk') then
    raise exception 'bad_choice';
  end if;

  update public.room_players
  set dilemma_choice = p_choice, last_seen_at = now()
  where room_id = p_room_id and user_id = p_user_id and is_alive and left_at is null;

  update public.room_players
  set dilemma_choice = case when random() < 0.45 then 'risk' else 'split' end
  where room_id = p_room_id and is_alive and left_at is null and is_bot and dilemma_choice is null;

  select bool_and(dilemma_choice is not null) into all_done
  from public.room_players
  where room_id = p_room_id and is_alive and left_at is null;

  if all_done then
    update public.rooms set phase_ends_at = now() where id = p_room_id and phase = 'dilemma';
    return public.advance_room_phase(p_room_id);
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

create or replace function public.submit_rps(p_room_id uuid, p_user_id bigint, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare all_done boolean;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and status = 'playing' and phase = 'finals') then
    raise exception 'wrong_phase';
  end if;
  if p_choice not in ('rock', 'paper', 'scissors') then
    raise exception 'bad_choice';
  end if;

  update public.room_players
  set rps_choice = p_choice, last_seen_at = now()
  where room_id = p_room_id and user_id = p_user_id and is_alive and left_at is null;

  update public.room_players
  set rps_choice = (array['rock','paper','scissors'])[floor(random() * 3 + 1)::int]
  where room_id = p_room_id and is_alive and left_at is null and is_bot and rps_choice is null;

  select bool_and(rps_choice is not null) into all_done
  from public.room_players
  where room_id = p_room_id and is_alive and left_at is null;

  if all_done then
    update public.rooms set phase_ends_at = now() where id = p_room_id and phase = 'finals';
    return public.advance_room_phase(p_room_id);
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

grant execute on function public.heartbeat_room(uuid, bigint) to anon, authenticated, service_role;
grant execute on function public.leave_room(uuid, bigint) to anon, authenticated, service_role;
grant execute on function public.resolve_if_single_alive(uuid) to anon, authenticated, service_role;
grant execute on function public.enqueue_matchmaking(bigint, int, int) to anon, authenticated, service_role;
grant execute on function public.create_room(bigint, int, boolean, int) to anon, authenticated, service_role;
grant execute on function public.join_room(bigint, text, uuid) to anon, authenticated, service_role;
grant execute on function public.start_room(uuid, bigint) to anon, authenticated, service_role;
grant execute on function public.advance_room_phase(uuid) to anon, authenticated, service_role;
grant execute on function public.submit_vote(uuid, bigint, bigint) to anon, authenticated, service_role;
grant execute on function public.submit_dilemma(uuid, bigint, text) to anon, authenticated, service_role;
grant execute on function public.submit_rps(uuid, bigint, text) to anon, authenticated, service_role;
