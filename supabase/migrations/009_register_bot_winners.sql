-- Bot ids can win finals, so they must satisfy rooms.winner_id foreign key.

insert into public.users (id, first_name, username)
values
  (-1, 'Bot 1', null),
  (-2, 'Bot 2', null),
  (-3, 'Bot 3', null),
  (-4, 'Bot 4', null),
  (-5, 'Bot 5', null)
on conflict (id) do update
set first_name = excluded.first_name,
    username = excluded.username;
