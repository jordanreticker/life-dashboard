-- send_push v2: HTML formatting always on, optional image attachment.
-- Pushover renders <b>, <i>, <font color>, <a href> when html=1, and displays
-- an attached image (base64, ≤2.5MB) directly in the notification.
-- Signature changes, so drop the old overload first (create or replace with new
-- defaults would otherwise leave two functions).

drop function if exists public.send_push(text, text, integer, text);

create or replace function public.send_push(
  p_title text,
  p_message text,
  p_priority integer default 0,
  p_url text default 'https://jordanreticker.github.io/life-dashboard',
  p_attachment_b64 text default null,
  p_attachment_type text default 'image/png'
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_user  text;
  v_body  jsonb;
  v_request_id bigint;
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'pushover_app_token';
  select decrypted_secret into v_user
    from vault.decrypted_secrets where name = 'pushover_user_key';

  if v_token is null or v_user is null then
    raise exception 'Pushover credentials missing from Vault';
  end if;

  v_body := jsonb_build_object(
    'token',    v_token,
    'user',     v_user,
    'title',    p_title,
    'message',  p_message,
    'html',     1,
    'priority', coalesce(p_priority, 0),
    'url',      p_url
  );

  if p_attachment_b64 is not null then
    v_body := v_body || jsonb_build_object(
      'attachment_base64', p_attachment_b64,
      'attachment_type',   coalesce(p_attachment_type, 'image/png')
    );
  end if;

  select net.http_post(
    url     := 'https://api.pushover.net/1/messages.json',
    body    := v_body,
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.send_push(text, text, integer, text, text, text) from public, anon;
grant execute on function public.send_push(text, text, integer, text, text, text) to authenticated, service_role;
