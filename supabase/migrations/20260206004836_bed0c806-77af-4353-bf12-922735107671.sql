-- =====================================================
-- SISTEMA DE MACHINE LEARNING PARA MELHORIA CONTÍNUA
-- =====================================================

-- Tabela de correções validadas (RAG - exemplos para o prompt)
CREATE TABLE IF NOT EXISTS public.ml_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Dados originais da identificação incorreta
  original_brand TEXT,
  original_model TEXT,
  original_manufacturer TEXT,
  original_scale TEXT,
  original_year TEXT,
  
  -- Dados corrigidos pelo usuário
  corrected_brand TEXT,
  corrected_model TEXT,
  corrected_manufacturer TEXT,
  corrected_scale TEXT,
  corrected_year TEXT,
  
  -- Campo que foi corrigido (para categorização)
  corrected_field TEXT NOT NULL,
  
  -- Contexto visual (para RAG)
  visual_cues TEXT, -- "carro vermelho com chamas", "base preta com logo verde"
  
  -- Métricas
  times_used INTEGER DEFAULT 0, -- Quantas vezes essa correção ajudou
  confidence_boost DECIMAL(3,2) DEFAULT 0.0, -- Quanto essa correção melhorou a precisão
  
  -- Status
  is_validated BOOLEAN DEFAULT true,
  validation_count INTEGER DEFAULT 1 -- Quantos usuários confirmaram essa correção
);

-- Tabela de variantes de prompt para A/B testing
CREATE TABLE IF NOT EXISTS public.ml_prompt_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  name TEXT NOT NULL, -- "v1_base", "v2_manufacturer_focus", etc.
  description TEXT,
  
  -- O snippet de prompt adicional (será concatenado ao base)
  prompt_snippet TEXT NOT NULL,
  
  -- Tipo de melhoria alvo
  target_field TEXT, -- "manufacturer", "model", "scale", null = geral
  
  -- Métricas de performance
  total_uses INTEGER DEFAULT 0,
  successful_identifications INTEGER DEFAULT 0,
  error_reports INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,4) DEFAULT 0.0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_control BOOLEAN DEFAULT false -- Variante de controle para A/B
);

-- Tabela de resultados de A/B testing
CREATE TABLE IF NOT EXISTS public.ml_ab_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  variant_id UUID REFERENCES public.ml_prompt_variants(id),
  item_id UUID, -- ID do item analisado
  user_id UUID,
  
  -- Resultado
  was_successful BOOLEAN, -- null = ainda não avaliado
  error_field TEXT, -- qual campo teve erro, se houver
  
  -- Tempo de resposta
  response_time_ms INTEGER,
  
  -- Modelo usado
  model_used TEXT
);

-- Tabela de padrões aprendidos (erros recorrentes)
CREATE TABLE IF NOT EXISTS public.ml_learned_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Padrão identificado
  pattern_type TEXT NOT NULL, -- "manufacturer_confusion", "model_misidentification", "scale_error"
  
  -- Gatilho do padrão
  trigger_condition TEXT NOT NULL, -- "Hot Wheels frequentemente confundido com Matchbox"
  
  -- Correção sugerida (snippet de prompt)
  correction_prompt TEXT NOT NULL,
  
  -- Exemplos
  examples JSONB DEFAULT '[]'::jsonb,
  
  -- Métricas
  occurrence_count INTEGER DEFAULT 1,
  last_occurrence TIMESTAMP WITH TIME ZONE DEFAULT now(),
  effectiveness_score DECIMAL(3,2) DEFAULT 0.0
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ml_corrections_field ON public.ml_corrections(corrected_field);
CREATE INDEX IF NOT EXISTS idx_ml_corrections_validated ON public.ml_corrections(is_validated) WHERE is_validated = true;
CREATE INDEX IF NOT EXISTS idx_ml_prompt_variants_active ON public.ml_prompt_variants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ml_ab_results_variant ON public.ml_ab_results(variant_id);
CREATE INDEX IF NOT EXISTS idx_ml_patterns_type ON public.ml_learned_patterns(pattern_type);

-- RLS Policies
ALTER TABLE public.ml_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_prompt_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_ab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_learned_patterns ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (sistema lê para gerar prompts)
CREATE POLICY "Allow read for all" ON public.ml_corrections FOR SELECT USING (true);
CREATE POLICY "Allow read for all" ON public.ml_prompt_variants FOR SELECT USING (true);
CREATE POLICY "Allow read for all" ON public.ml_learned_patterns FOR SELECT USING (true);

-- Políticas de escrita para service role (edge functions)
CREATE POLICY "Service role can insert corrections" ON public.ml_corrections FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update corrections" ON public.ml_corrections FOR UPDATE USING (true);
CREATE POLICY "Service role can insert variants" ON public.ml_prompt_variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update variants" ON public.ml_prompt_variants FOR UPDATE USING (true);
CREATE POLICY "Service role can insert ab_results" ON public.ml_ab_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can insert patterns" ON public.ml_learned_patterns FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update patterns" ON public.ml_learned_patterns FOR UPDATE USING (true);

-- Inserir variantes iniciais de prompt para A/B testing
INSERT INTO public.ml_prompt_variants (name, description, prompt_snippet, target_field, is_control)
VALUES 
  ('control', 'Prompt base sem modificações', '', NULL, true),
  
  ('manufacturer_v1', 'Ênfase em verificação de base do carrinho', 
   'ATENÇÃO EXTRA PARA FABRICANTES: Sempre verifique a BASE do carrinho. Hot Wheels tem base metálica com logo "HW". Matchbox tem logo "Matchbox" na base. Greenlight tem "GL" estilizado. Majorette tem "Majorette" em cursivo. NUNCA assuma o fabricante pelo estilo - SEMPRE confirme pela base.',
   'manufacturer', false),
  
  ('scale_v1', 'Regras detalhadas de escala',
   'REGRAS DE ESCALA: 1:64 é o padrão Hot Wheels/Matchbox (≈7.5cm). 1:43 são modelos maiores (≈10-11cm). 1:24 são modelos grandes (≈18-20cm). 1:18 são modelos premium grandes (≈25cm). Compare o tamanho visual do modelo com objetos de referência na imagem.',
   'scale', false),
  
  ('model_v1', 'Identificação detalhada de modelos',
   'IDENTIFICAÇÃO DE MODELO: Preste atenção em: formato dos faróis, grade frontal, linhas do capô, formato das janelas, spoilers, saídas de ar. Modelos diferentes da mesma marca têm características únicas. Ex: Mustang tem traseira com 3 barras verticais, Camaro tem grade dividida.',
   'model', false);

-- Função para buscar correções relevantes (RAG)
CREATE OR REPLACE FUNCTION public.get_relevant_corrections(
  p_brand TEXT DEFAULT NULL,
  p_manufacturer TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  original_brand TEXT,
  original_model TEXT,
  original_manufacturer TEXT,
  corrected_brand TEXT,
  corrected_model TEXT,
  corrected_manufacturer TEXT,
  visual_cues TEXT,
  confidence_boost DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.original_brand,
    c.original_model,
    c.original_manufacturer,
    c.corrected_brand,
    c.corrected_model,
    c.corrected_manufacturer,
    c.visual_cues,
    c.confidence_boost
  FROM ml_corrections c
  WHERE c.is_validated = true
    AND (
      (p_brand IS NOT NULL AND (c.original_brand ILIKE '%' || p_brand || '%' OR c.corrected_brand ILIKE '%' || p_brand || '%'))
      OR
      (p_manufacturer IS NOT NULL AND (c.original_manufacturer ILIKE '%' || p_manufacturer || '%' OR c.corrected_manufacturer ILIKE '%' || p_manufacturer || '%'))
      OR (p_brand IS NULL AND p_manufacturer IS NULL)
    )
  ORDER BY c.validation_count DESC, c.times_used DESC
  LIMIT p_limit;
END;
$$;

-- Função para selecionar variante de prompt (A/B testing)
CREATE OR REPLACE FUNCTION public.select_prompt_variant()
RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  prompt_snippet TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_random DECIMAL;
  v_control_weight DECIMAL := 0.3; -- 30% controle, 70% distribuído entre variantes
BEGIN
  v_random := random();
  
  -- 30% de chance de usar controle
  IF v_random < v_control_weight THEN
    RETURN QUERY
    SELECT pv.id, pv.name, pv.prompt_snippet
    FROM ml_prompt_variants pv
    WHERE pv.is_control = true AND pv.is_active = true
    LIMIT 1;
  ELSE
    -- 70% distribuído entre variantes ativas (não controle)
    RETURN QUERY
    SELECT pv.id, pv.name, pv.prompt_snippet
    FROM ml_prompt_variants pv
    WHERE pv.is_control = false AND pv.is_active = true
    ORDER BY random()
    LIMIT 1;
  END IF;
  
  -- Fallback para controle se nenhuma variante encontrada
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT pv.id, pv.name, pv.prompt_snippet
    FROM ml_prompt_variants pv
    WHERE pv.is_control = true
    LIMIT 1;
  END IF;
END;
$$;

-- Função para registrar resultado de A/B test
CREATE OR REPLACE FUNCTION public.record_ab_result(
  p_variant_id UUID,
  p_item_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_was_successful BOOLEAN DEFAULT NULL,
  p_error_field TEXT DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_model_used TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id UUID;
BEGIN
  INSERT INTO ml_ab_results (variant_id, item_id, user_id, was_successful, error_field, response_time_ms, model_used)
  VALUES (p_variant_id, p_item_id, p_user_id, p_was_successful, p_error_field, p_response_time_ms, p_model_used)
  RETURNING id INTO v_result_id;
  
  -- Atualizar métricas da variante
  UPDATE ml_prompt_variants
  SET 
    total_uses = total_uses + 1,
    successful_identifications = successful_identifications + CASE WHEN p_was_successful = true THEN 1 ELSE 0 END,
    error_reports = error_reports + CASE WHEN p_was_successful = false THEN 1 ELSE 0 END,
    accuracy_rate = CASE 
      WHEN total_uses + 1 > 0 
      THEN (successful_identifications + CASE WHEN p_was_successful = true THEN 1 ELSE 0 END)::DECIMAL / (total_uses + 1)
      ELSE 0 
    END
  WHERE id = p_variant_id;
  
  RETURN v_result_id;
END;
$$;

-- Função para obter padrões aprendidos ativos
CREATE OR REPLACE FUNCTION public.get_active_patterns(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  pattern_type TEXT,
  trigger_condition TEXT,
  correction_prompt TEXT,
  effectiveness_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lp.pattern_type,
    lp.trigger_condition,
    lp.correction_prompt,
    lp.effectiveness_score
  FROM ml_learned_patterns lp
  WHERE lp.occurrence_count >= 3 -- Mínimo de 3 ocorrências para ser considerado
    AND lp.effectiveness_score >= 0.5 -- Mínimo de 50% efetividade
  ORDER BY lp.effectiveness_score DESC, lp.occurrence_count DESC
  LIMIT p_limit;
END;
$$;