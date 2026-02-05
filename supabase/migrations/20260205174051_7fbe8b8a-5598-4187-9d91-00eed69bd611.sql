-- =============================================
-- Tabela: scanner_error_logs
-- Armazena erros ocorridos durante análise de colecionáveis
-- =============================================

CREATE TABLE IF NOT EXISTS public.scanner_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para consultas rápidas
CREATE INDEX idx_scanner_errors_created_at ON public.scanner_error_logs(created_at DESC);
CREATE INDEX idx_scanner_errors_type ON public.scanner_error_logs(error_type);
CREATE INDEX idx_scanner_errors_user ON public.scanner_error_logs(user_id);

-- Habilitar RLS
ALTER TABLE public.scanner_error_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ler logs de erro
CREATE POLICY "Admins can read all error logs"
  ON public.scanner_error_logs FOR SELECT
  USING (public.is_admin());

-- Service role pode inserir (edge functions)
CREATE POLICY "Service role can insert error logs"
  ON public.scanner_error_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- Função RPC: get_admin_scanner_performance
-- Retorna estatísticas de performance do scanner
-- =============================================

CREATE OR REPLACE FUNCTION public.get_admin_scanner_performance(days_back INTEGER DEFAULT 7)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSON;
    start_date TIMESTAMP;
BEGIN
    -- Verificar se é admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    start_date := now() - (days_back || ' days')::INTERVAL;
    
    SELECT json_build_object(
        'total_scans', (
            SELECT COUNT(*) 
            FROM public.ai_usage_logs 
            WHERE function_name = 'analyze-collectible' 
            AND created_at >= start_date
        ),
        'successful_scans', (
            SELECT COUNT(*) 
            FROM public.ai_usage_logs 
            WHERE function_name = 'analyze-collectible' 
            AND created_at >= start_date
            AND (metadata->>'identified')::boolean = true
        ),
        'failed_scans', (
            SELECT COUNT(*) 
            FROM public.scanner_error_logs 
            WHERE created_at >= start_date
        ),
        'success_rate', (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN 
                    ROUND(
                        (COUNT(*) FILTER (WHERE (metadata->>'identified')::boolean = true)::NUMERIC / COUNT(*) * 100),
                        1
                    )
                ELSE 0
            END
            FROM public.ai_usage_logs 
            WHERE function_name = 'analyze-collectible' 
            AND created_at >= start_date
        ),
        'errors_by_type', (
            SELECT COALESCE(json_agg(row_to_json(et)), '[]'::json)
            FROM (
                SELECT 
                    error_type,
                    COUNT(*) as count,
                    ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM public.scanner_error_logs WHERE created_at >= start_date), 0) * 100), 1) as percentage
                FROM public.scanner_error_logs
                WHERE created_at >= start_date
                GROUP BY error_type
                ORDER BY count DESC
            ) et
        ),
        'recent_errors', (
            SELECT COALESCE(json_agg(row_to_json(re)), '[]'::json)
            FROM (
                SELECT 
                    sel.id,
                    sel.created_at,
                    sel.user_id,
                    COALESCE(p.username, 'Anônimo') as username,
                    sel.error_type,
                    sel.error_message,
                    sel.function_name
                FROM public.scanner_error_logs sel
                LEFT JOIN public.profiles p ON p.user_id = sel.user_id
                WHERE sel.created_at >= start_date
                ORDER BY sel.created_at DESC
                LIMIT 50
            ) re
        ),
        'daily_stats', (
            SELECT COALESCE(json_agg(row_to_json(ds)), '[]'::json)
            FROM (
                SELECT 
                    DATE_TRUNC('day', aul.created_at)::DATE as date,
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE (aul.metadata->>'identified')::boolean = true) as success,
                    COUNT(*) FILTER (WHERE (aul.metadata->>'identified')::boolean IS DISTINCT FROM true) as failed
                FROM public.ai_usage_logs aul
                WHERE aul.function_name = 'analyze-collectible'
                AND aul.created_at >= start_date
                GROUP BY DATE_TRUNC('day', aul.created_at)
                ORDER BY date DESC
            ) ds
        ),
        'accuracy_feedback', (
            SELECT json_build_object(
                'total', (SELECT COUNT(*) FROM public.scan_feedback WHERE created_at >= start_date),
                'positive', (SELECT COUNT(*) FROM public.scan_feedback WHERE feedback_type = 'like' AND created_at >= start_date),
                'negative', (SELECT COUNT(*) FROM public.scan_feedback WHERE feedback_type = 'report' AND created_at >= start_date),
                'by_field', (
                    SELECT COALESCE(json_agg(row_to_json(bf)), '[]'::json)
                    FROM (
                        SELECT 
                            COALESCE(error_field, 'general') as field,
                            COUNT(*) as reports
                        FROM public.scan_feedback
                        WHERE feedback_type = 'report'
                        AND created_at >= start_date
                        GROUP BY error_field
                        ORDER BY reports DESC
                        LIMIT 10
                    ) bf
                )
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$;