-- Real leaderboard and idempotent room result claiming.

update public.balances b
set coins = 50
where b.coins = 100
  and exists (
    select 1 from public.transactions t
    where t.user_id = b.user_id and t.kind = 'signup_bonus' and t.amount = 50
  )
  and not exists (
    select 1 from public.transactions t
    where t.user_id = b.user_id and t.kind <> 'signup_bonus'
  );

create or replace function public.profile_payload(p_user_id bigint)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id', u.id,
    'firstName', u.first_name,
    'username', u.username,
    'level', u.level,
    'xp', u.xp,
    'xpToNext', 100,
    'gamesPlayed', u.games_played,
    'wins', u.wins,
    'globalRank', coalesce(r.rank, 0),
    'coins', b.coins,
    'stars', b.stars
  )
  from public.users u
  join public.balances b on b.user_id = u.id
  left join (
    select id, row_number() over (order by wins desc, xp desc, games_played asc, created_at asc) rank
    from public.users
    where games_played > 0
  ) r on r.id = u.id
  where u.id = p_user_id;
$$;

create or replace function public.ensure_user(p_telegram_user jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid bigint := (p_telegram_user->>'id')::bigint;
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

  return public.profile_payload(uid);
end;
$$;

create or replace function public.get_leaderboard(p_limit int default 50)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(row_to_json(rows)), '[]'::jsonb)
  from (
    select
      row_number() over (order by u.wins desc, u.xp desc, u.games_played asc, u.created_at asc) as rank,
      u.id as "userId",
      u.first_name as "displayName",
      u.username,
      u.wins,
      u.games_played as "gamesPlayed",
      (u.wins * 100 + u.xp) as score
    from public.users u
    where u.games_played > 0
    order by u.wins desc, u.xp desc, u.games_played asc, u.created_at asc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ) rows;
$$;

create or replace function public.claim_room_reward(p_room_id uuid, p_user_id bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  rm public.rooms%rowtype;
  participant_exists boolean;
  alive_cnt int;
  reward int := 0;
  already_claimed boolean;
  won boolean := false;
begin
  select * into rm from public.rooms where id = p_room_id;
  if rm.id is null then raise exception 'room_not_found'; end if;
  if rm.status <> 'finished' then raise exception 'room_not_finished'; end if;

  select exists (
    select 1 from public.room_players where room_id = p_room_id and user_id = p_user_id
  ) into participant_exists;
  if not participant_exists then raise exception 'not_room_player'; end if;

  select exists (
    select 1 from public.transactions
    where user_id = p_user_id and kind = 'room_result' and ref_id = p_room_id::text
  ) into already_claimed;

  if already_claimed then
    return jsonb_build_object('reward', 0, 'profile', public.profile_payload(p_user_id));
  end if;

  if rm.winner_id is null then
    select count(*) into alive_cnt from public.room_players where room_id = p_room_id and is_alive;
    if exists (select 1 from public.room_players where room_id = p_room_id and user_id = p_user_id and is_alive) then
      reward := floor(rm.pot / greatest(1, alive_cnt));
    end if;
  elsif rm.winner_id = p_user_id then
    reward := rm.pot;
    won := true;
  end if;

  insert into public.transactions (user_id, kind, amount, ref_id)
  values (p_user_id, 'room_result', reward, p_room_id::text);

  if reward > 0 then
    update public.balances set coins = coins + reward where user_id = p_user_id;
  end if;

  update public.users
  set games_played = games_played + 1,
      wins = wins + case when won then 1 else 0 end,
      xp = xp + case when won then 50 else 15 end
  where id = p_user_id;

  return jsonb_build_object('reward', reward, 'profile', public.profile_payload(p_user_id));
end;
$$;

grant execute on function public.profile_payload(bigint) to anon, authenticated, service_role;
grant execute on function public.get_leaderboard(int) to anon, authenticated, service_role;
grant execute on function public.claim_room_reward(uuid, bigint) to anon, authenticated, service_role;
