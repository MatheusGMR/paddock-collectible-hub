-- Create table to track AI usage
CREATE TABLE public.ai_usage_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    function_name TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
    cost_estimate_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read AI usage logs
CREATE POLICY "Admins can read AI usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Edge functions can insert logs (no auth required for insert from backend)
CREATE POLICY "Service role can insert AI usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_function_name ON public.ai_usage_logs(function_name);

-- Create function to get AI usage stats for admin
CREATE OR REPLACE FUNCTION public.get_admin_ai_usage_stats(days_back INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if user is admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    SELECT json_build_object(
        'total_requests', (
            SELECT COUNT(*) 
            FROM public.ai_usage_logs 
            WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        ),
        'total_tokens', (
            SELECT COALESCE(SUM(total_tokens), 0)
            FROM public.ai_usage_logs 
            WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        ),
        'total_cost_usd', (
            SELECT COALESCE(SUM(cost_estimate_usd), 0)::NUMERIC(10, 4)
            FROM public.ai_usage_logs 
            WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
        ),
        'by_function', (
            SELECT json_agg(row_to_json(bf))
            FROM (
                SELECT 
                    function_name,
                    COUNT(*) as requests,
                    SUM(total_tokens) as tokens,
                    SUM(cost_estimate_usd)::NUMERIC(10, 4) as cost_usd
                FROM public.ai_usage_logs
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY function_name
                ORDER BY cost_usd DESC
            ) bf
        ),
        'by_user', (
            SELECT json_agg(row_to_json(bu))
            FROM (
                SELECT 
                    al.user_id,
                    p.username,
                    COUNT(*) as requests,
                    SUM(al.total_tokens) as tokens,
                    SUM(al.cost_estimate_usd)::NUMERIC(10, 4) as cost_usd
                FROM public.ai_usage_logs al
                LEFT JOIN public.profiles p ON p.user_id = al.user_id
                WHERE al.created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY al.user_id, p.username
                ORDER BY cost_usd DESC
                LIMIT 20
            ) bu
        ),
        'daily_usage', (
            SELECT json_agg(row_to_json(du))
            FROM (
                SELECT 
                    DATE_TRUNC('day', created_at)::DATE as date,
                    COUNT(*) as requests,
                    SUM(total_tokens) as tokens,
                    SUM(cost_estimate_usd)::NUMERIC(10, 4) as cost_usd
                FROM public.ai_usage_logs
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY date DESC
            ) du
        ),
        'by_model', (
            SELECT json_agg(row_to_json(bm))
            FROM (
                SELECT 
                    model,
                    COUNT(*) as requests,
                    SUM(total_tokens) as tokens,
                    SUM(cost_estimate_usd)::NUMERIC(10, 4) as cost_usd
                FROM public.ai_usage_logs
                WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
                GROUP BY model
                ORDER BY cost_usd DESC
            ) bm
        )
    ) INTO result;
    
    RETURN result;
END;
$$;