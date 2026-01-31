-- Create analytics_events table to track user behavior
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'page_view', 'interaction', 'session_start', 'session_end'
    page_path TEXT NOT NULL,
    page_title TEXT,
    duration_ms INTEGER, -- Time spent on page in milliseconds
    interaction_type TEXT, -- 'click', 'scroll', 'swipe', etc.
    interaction_target TEXT, -- Button name, element id, etc.
    metadata JSONB DEFAULT '{}',
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (even anonymous users for tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Only admins can read analytics events
CREATE POLICY "Admins can read analytics events"
ON public.analytics_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get page analytics
CREATE OR REPLACE FUNCTION public.get_admin_page_analytics(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_build_object(
        'page_views', (
            SELECT json_agg(row_to_json(pv))
            FROM (
                SELECT 
                    page_path,
                    COUNT(*) as views,
                    COUNT(DISTINCT session_id) as unique_sessions,
                    AVG(duration_ms)::INTEGER as avg_duration_ms
                FROM public.analytics_events
                WHERE event_type = 'page_view'
                AND created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY page_path
                ORDER BY views DESC
                LIMIT 20
            ) pv
        ),
        'daily_stats', (
            SELECT json_agg(row_to_json(ds))
            FROM (
                SELECT 
                    DATE_TRUNC('day', created_at)::DATE as date,
                    COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
                    COUNT(*) FILTER (WHERE event_type = 'interaction') as interactions,
                    COUNT(DISTINCT session_id) as sessions,
                    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users
                FROM public.analytics_events
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY date DESC
            ) ds
        ),
        'top_interactions', (
            SELECT json_agg(row_to_json(ti))
            FROM (
                SELECT 
                    interaction_target,
                    interaction_type,
                    page_path,
                    COUNT(*) as count
                FROM public.analytics_events
                WHERE event_type = 'interaction'
                AND interaction_target IS NOT NULL
                AND created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY interaction_target, interaction_type, page_path
                ORDER BY count DESC
                LIMIT 20
            ) ti
        ),
        'user_flow', (
            SELECT json_agg(row_to_json(uf))
            FROM (
                SELECT 
                    page_path as from_page,
                    next_page as to_page,
                    COUNT(*) as transitions
                FROM (
                    SELECT 
                        page_path,
                        LEAD(page_path) OVER (PARTITION BY session_id ORDER BY created_at) as next_page
                    FROM public.analytics_events
                    WHERE event_type = 'page_view'
                    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
                ) sub
                WHERE next_page IS NOT NULL
                GROUP BY page_path, next_page
                ORDER BY transitions DESC
                LIMIT 30
            ) uf
        ),
        'avg_session_duration', (
            SELECT AVG(session_duration)::INTEGER
            FROM (
                SELECT 
                    session_id,
                    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000 as session_duration
                FROM public.analytics_events
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY session_id
                HAVING COUNT(*) > 1
            ) sd
        ),
        'device_breakdown', (
            SELECT json_agg(row_to_json(db))
            FROM (
                SELECT 
                    COALESCE(device_type, 'unknown') as device,
                    COUNT(DISTINCT session_id) as sessions
                FROM public.analytics_events
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY device_type
            ) db
        ),
        'bounce_rate', (
            SELECT 
                ROUND(
                    (COUNT(*) FILTER (WHERE event_count = 1)::NUMERIC / NULLIF(COUNT(*), 0) * 100),
                    2
                )
            FROM (
                SELECT session_id, COUNT(*) as event_count
                FROM public.analytics_events
                WHERE event_type = 'page_view'
                AND created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY session_id
            ) sc
        )
    ) INTO result;
    
    RETURN result;
END;
$$;