-- Phase advancement (called by room-tick edge function with service_role)
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
