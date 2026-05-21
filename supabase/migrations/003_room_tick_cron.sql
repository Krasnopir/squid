-- Historical migration slot for the original room-tick cron setup.
--
-- The first applied version of this migration scheduled room-tick with an
-- inline service-role JWT. Do not store that key in git. The live cron job is
-- replaced safely in 005_room_tick_cron_vault.sql.
create extension if not exists pg_cron;
create extension if not exists pg_net;
