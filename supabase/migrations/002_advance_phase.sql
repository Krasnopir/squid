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
  elim_uid bigint;
  ph text;
begin
  select * into rm from public.rooms where id = p_room_id for update;
  if rm.status != 'playing' then return public.get_room_state(p_room_id); end if;
  if rm.phase_ends_at is not null and rm.phase_ends_at > now() then
    return public.get_room_state(p_room_id);
  end if;

  select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;

  if rm.phase = 'vote' then
    select count(*) into voted_cnt from public.room_players where room_id = p_room_id and is_alive and vote_target is not null;
    if voted_cnt < ceil(alive_cnt::numeric / 2) then
      update public.room_players set is_alive = false
      where room_id = p_room_id and user_id in (
        select user_id from public.room_players where room_id = p_room_id and is_alive
        order by random() limit least(2, greatest(0, alive_cnt - 2))
      );
    else
      select vote_target, count(*) into leader, max_votes
      from public.room_players where room_id = p_room_id and is_alive and vote_target is not null
      group by vote_target order by count(*) desc limit 1;
      select count(*) into leaders from (
        select vote_target from public.room_players where room_id = p_room_id and is_alive and vote_target is not null
        group by vote_target having count(*) = max_votes
      ) t;
      if leaders > 1 then
        update public.room_players set is_alive = false
        where room_id = p_room_id and user_id in (
          select user_id from public.room_players where room_id = p_room_id and is_alive
          order by random() limit least(2, greatest(0, alive_cnt - 2))
        );
      else
        update public.room_players set is_alive = false where room_id = p_room_id and user_id = leader;
      end if;
    end if;
    update public.room_players set vote_target = null where room_id = p_room_id;
    update public.rooms set phase = 'reveal_elimination', phase_ends_at = now() + interval '3 seconds' where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'reveal_elimination' then
    select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;
    if alive_cnt <= 2 then ph := 'finals';
    elsif rm.round_index = 0 and alive_cnt >= 3 then ph := 'dilemma';
    else ph := 'vote';
    end if;
    update public.rooms set phase = ph, round_index = rm.round_index + 1,
      phase_ends_at = now() + case ph when 'finals' then interval '15 seconds' when 'dilemma' then interval '25 seconds' else interval '30 seconds' end
    where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'dilemma' then
    update public.rooms set status = 'finished', phase = 'results', phase_ends_at = now() + interval '60 seconds'
    where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  if rm.phase = 'finals' then
    update public.rooms set status = 'finished', phase = 'results', winner_id = (
      select user_id from public.room_players where room_id = p_room_id and is_alive limit 1
    ), phase_ends_at = now() + interval '60 seconds' where id = p_room_id;
    return public.get_room_state(p_room_id);
  end if;

  return public.get_room_state(p_room_id);
end;
$$;

grant execute on function public.advance_room_phase(uuid) to service_role;
