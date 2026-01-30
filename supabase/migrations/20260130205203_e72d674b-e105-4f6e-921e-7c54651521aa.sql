-- Fix security issues: Drop views that expose auth.users and recreate them securely

-- Drop problematic views
DROP VIEW IF EXISTS public.admin_stats;
DROP VIEW IF EXISTS public.admin_subscription_stats;
DROP VIEW IF EXISTS public.admin_user_growth;

-- Create secure admin stats function instead (returns data only to admins)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM public.profiles),
        'total_items', (SELECT COUNT(*) FROM public.items),
        'total_collection_items', (SELECT COUNT(*) FROM public.user_collection),
        'total_posts', (SELECT COUNT(*) FROM public.posts),
        'total_likes', COALESCE((SELECT SUM(likes_count) FROM public.posts), 0),
        'active_listings', (SELECT COUNT(*) FROM public.listings WHERE status = 'active'),
        'total_follows', (SELECT COUNT(*) FROM public.follows)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Create secure subscription stats function
CREATE OR REPLACE FUNCTION public.get_admin_subscription_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'status', status,
            'count', cnt,
            'date', date
        )
    ) INTO result
    FROM (
        SELECT 
            status,
            COUNT(*) as cnt,
            DATE_TRUNC('day', created_at)::date as date
        FROM public.user_subscriptions
        GROUP BY status, DATE_TRUNC('day', created_at)
        ORDER BY date DESC
    ) sub;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create secure user growth function
CREATE OR REPLACE FUNCTION public.get_admin_user_growth()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'date', date,
            'new_users', new_users
        )
    ) INTO result
    FROM (
        SELECT 
            DATE_TRUNC('day', created_at)::date as date,
            COUNT(*) as new_users
        FROM public.profiles
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
    ) growth;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create function to get all users for admin
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_agg(
        json_build_object(
            'id', p.id,
            'user_id', p.user_id,
            'username', p.username,
            'avatar_url', p.avatar_url,
            'city', p.city,
            'created_at', p.created_at,
            'collection_count', COALESCE(uc.cnt, 0),
            'posts_count', COALESCE(po.cnt, 0)
        )
    ) INTO result
    FROM public.profiles p
    LEFT JOIN (
        SELECT user_id, COUNT(*) as cnt FROM public.user_collection GROUP BY user_id
    ) uc ON uc.user_id = p.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as cnt FROM public.posts GROUP BY user_id
    ) po ON po.user_id = p.user_id
    ORDER BY p.created_at DESC;
    
    RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;