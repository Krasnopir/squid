-- Run room-tick every minute via pg_cron + pg_net.
-- Store secrets in Supabase Vault before applying:
-- select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'project_url');
-- select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
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
