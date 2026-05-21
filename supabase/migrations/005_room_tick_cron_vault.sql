-- Replace the previously applied hardcoded room-tick cron with Vault-backed secrets.
--
-- Required before applying this migration:
-- select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_ROTATED_SERVICE_ROLE_KEY', 'service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  perform cron.unschedule('room-tick-every-minute');
exception
  when others then
    null;
end;
$$;

select cron.schedule(
  'room-tick-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/room-tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
