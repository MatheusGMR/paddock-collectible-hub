CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_profile json;
BEGIN
  -- Find user by email in auth.users
  SELECT id, raw_user_meta_data->>'name'
  INTO v_user_id, v_name
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('exists', false);
  END IF;

  -- Get profile data
  SELECT json_build_object('username', p.username, 'avatar_url', p.avatar_url)
  INTO v_profile
  FROM profiles p
  WHERE p.user_id = v_user_id;

  RETURN json_build_object(
    'exists', true,
    'name', v_name,
    'profile', COALESCE(v_profile, null)
  );
END;
$$;