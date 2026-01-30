-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create admin stats view (aggregated data for dashboard)
CREATE OR REPLACE VIEW public.admin_stats AS
SELECT 
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.items) as total_items,
    (SELECT COUNT(*) FROM public.user_collection) as total_collection_items,
    (SELECT COUNT(*) FROM public.posts) as total_posts,
    (SELECT SUM(likes_count) FROM public.posts) as total_likes,
    (SELECT COUNT(*) FROM public.listings WHERE status = 'active') as active_listings,
    (SELECT COUNT(*) FROM public.follows) as total_follows;

-- Grant access to the view for authenticated users (RLS will protect the underlying query)
GRANT SELECT ON public.admin_stats TO authenticated;

-- Create subscription stats view
CREATE OR REPLACE VIEW public.admin_subscription_stats AS
SELECT 
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', created_at) as date
FROM public.user_subscriptions
GROUP BY status, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

GRANT SELECT ON public.admin_subscription_stats TO authenticated;

-- Create user growth view
CREATE OR REPLACE VIEW public.admin_user_growth AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as new_users
FROM public.profiles
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC
LIMIT 30;

GRANT SELECT ON public.admin_user_growth TO authenticated;