-- send_push_card: invoke the push-card Edge Function from Postgres (pg_net).
-- The function renders the card image server-side and posts to Pushover —
-- image bytes never pass through the agent or the Cowork sandbox.
-- Caller auth: x-push-secret header, read from Vault ('push_fn_secret',
-- entered out-of-band — see USER_TODO.md Phase G).

create or replace function public.send_push_card(p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_fn_secret';

  if v_secret is null then
    raise exception 'push_fn_secret missing from Vault';
  end if;

  select net.http_post(
    url     := 'https://rhotxathnmkzbtlgxgjv.supabase.co/functions/v1/push-card',
    body    := p_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    timeout_milliseconds := 15000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.send_push_card(jsonb) from public, anon;
grant execute on function public.send_push_card(jsonb) to authenticated, service_role;
