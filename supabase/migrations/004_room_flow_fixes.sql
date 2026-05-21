-- Forward-only fixes for already applied 001/002 migrations.
-- Do not edit historical migrations after they have been applied in Supabase.

alter table public.rooms
  add column if not exists last_eliminated_ids bigint[],
  add column if not exists last_vote_result jsonb,
  add column if not exists last_dilemma_result jsonb,
  add column if not exists last_final_result jsonb;

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

  insert into public.rooms (code, host_id, max_players, is_private, mode, pot)
  values (code, p_user_id, p_max_players, p_is_private, case when p_max_players <= 2 then 'duel' else 'classic' end, fee)
  returning id into rid;

  insert into public.room_players (room_id, user_id, display_name, username, seat, is_ready)
  select rid, u.id, u.first_name, u.username, 0, true from public.users u where u.id = p_user_id;

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

  ph := case when (select mode from public.rooms where id = p_room_id) = 'duel' or cnt <= 2 then 'finals' else 'vote' end;
  update public.rooms set
    status = 'playing',
    phase = ph,
    round_index = 0,
    phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' else interval '30 seconds' end,
    last_eliminated_ids = null,
    last_vote_result = null,
    last_dilemma_result = null,
    last_final_result = null
  where id = p_room_id;

  return public.get_room_state(p_room_id);
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

  if rm.status = 'waiting' then
    select count(*) into alive_cnt from public.room_players where room_id = p_room_id;
    if alive_cnt >= 2 and rm.phase_ends_at is not null and rm.phase_ends_at <= now() then
      ph := case when rm.mode = 'duel' or alive_cnt <= 2 then 'finals' else 'vote' end;
      update public.rooms set status = 'playing', phase = ph, round_index = 0,
        phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' else interval '30 seconds' end,
        last_eliminated_ids = null,
        last_vote_result = null,
        last_dilemma_result = null,
        last_final_result = null
      where id = p_room_id;
    end if;
    return public.get_room_state(p_room_id);
  end if;

  if rm.status != 'playing' then return public.get_room_state(p_room_id); end if;
  if rm.phase_ends_at is not null and rm.phase_ends_at > now() then
    return public.get_room_state(p_room_id);
  end if;

  select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;

  if rm.phase = 'vote' then
    select count(*) into voted_cnt from public.room_players where room_id = p_room_id and is_alive and vote_target is not null;
    if voted_cnt < ceil(alive_cnt::numeric / 2) then
      reason := 'low_turnout';
      select coalesce(array_agg(user_id), '{}') into elim_ids
      from (
        select user_id from public.room_players where room_id = p_room_id and is_alive
        order by random() limit least(2, greatest(0, alive_cnt - 2))
      ) t;
    else
      select vote_target, count(*) into leader, max_votes
      from public.room_players where room_id = p_room_id and is_alive and vote_target is not null
      group by vote_target order by count(*) desc limit 1;
      select count(*) into leaders from (
        select vote_target from public.room_players where room_id = p_room_id and is_alive and vote_target is not null
        group by vote_target having count(*) = max_votes
      ) t;
      if leaders > 1 then
        reason := 'tie';
        select coalesce(array_agg(user_id), '{}') into elim_ids
        from (
          select user_id from public.room_players where room_id = p_room_id and is_alive
          order by random() limit least(2, greatest(0, alive_cnt - 2))
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
    select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;
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
    select count(*) filter (where dilemma_choice = 'split'),
      count(*) filter (where dilemma_choice = 'risk' or dilemma_choice is null)
    into split_cnt, risk_cnt
    from public.room_players where room_id = p_room_id and is_alive;
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
    select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;
    ph := case when alive_cnt <= 2 then 'finals' else 'vote' end;
    update public.rooms set
      pot = pot + entry_fee * alive_cnt,
      phase = ph,
      round_index = rm.round_index + 1,
      phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' else interval '30 seconds' end,
      last_dilemma_result = null
    where id = p_room_id;
    update public.room_players set dilemma_choice = null where room_id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'finals' then
    select user_id into p1 from public.room_players where room_id = p_room_id and is_alive order by seat limit 1;
    select user_id into p2 from public.room_players where room_id = p_room_id and is_alive and user_id <> p1 order by seat limit 1;
    if p2 is null then
      update public.rooms set status = 'finished', phase = 'results', winner_id = p1,
        phase_ends_at = now() + interval '60 seconds' where id = p_room_id;
      return public.get_room_state(p_room_id);
    end if;
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
    update public.room_players set rps_choice = case when user_id = p1 then c1 when user_id = p2 then c2 else rps_choice end
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

grant execute on function public.advance_room_phase(uuid) to service_role;
