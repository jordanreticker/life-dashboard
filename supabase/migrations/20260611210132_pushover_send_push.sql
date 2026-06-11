-- Push notifications via Pushover, sent from Postgres (pg_net).
-- Credentials live in Supabase Vault (pushover_app_token / pushover_user_key),
-- inserted out-of-band (see USER_TODO.md) — never in migration files.

create extension if not exists pg_net;

create or replace function public.send_push(
  p_title text,
  p_message text,
  p_priority integer default 0,
  p_url text default 'https://jordanreticker.github.io/life-dashboard'
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_user  text;
  v_request_id bigint;
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'pushover_app_token';
  select decrypted_secret into v_user
    from vault.decrypted_secrets where name = 'pushover_user_key';

  if v_token is null or v_user is null then
    raise exception 'Pushover credentials missing from Vault';
  end if;

  select net.http_post(
    url     := 'https://api.pushover.net/1/messages.json',
    body    := jsonb_build_object(
      'token',    v_token,
      'user',     v_user,
      'title',    p_title,
      'message',  p_message,
      'priority', coalesce(p_priority, 0),
      'url',      p_url
    ),
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) into v_request_id;

  return v_request_id;
end;
$$;

-- Callable by the authenticated owner and service role only — never anon.
revoke execute on function public.send_push(text, text, integer, text) from public, anon;
grant execute on function public.send_push(text, text, integer, text) to authenticated, service_role;
