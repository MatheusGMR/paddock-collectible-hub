export interface IndexBreakdownItem {
  score: number;
  max: number;
  reason: string;
}

export interface PriceIndexBreakdown {
  rarity: IndexBreakdownItem; // max: 35 (legacy: 45)
  exclusivity?: IndexBreakdownItem; // max: 15
  condition: IndexBreakdownItem; // max: 15 (legacy: 20)
  manufacturer: IndexBreakdownItem; // max: 15
  scale: IndexBreakdownItem; // max: 10
  age: IndexBreakdownItem; // max: 10
  origin?: IndexBreakdownItem; // deprecated - kept for backwards compatibility
}

export interface PriceIndex {
  score: number;
  tier: 'common' | 'uncommon' | 'rare' | 'super_rare' | 'ultra_rare';
  breakdown: PriceIndexBreakdown;
}

export const getTierLabel = (tier: string): string => {
  const labels: Record<string, string> = {
    common: 'Comum',
    uncommon: 'Incomum',
    rare: 'Raro',
    super_rare: 'Super Raro',
    ultra_rare: 'Ultra Raro',
  };
  return labels[tier] || tier;
};

export const getTierColor = (tier: string): string => {
  const colors: Record<string, string> = {
    common: 'text-foreground-secondary',
    uncommon: 'text-green-500',
    rare: 'text-blue-500',
    super_rare: 'text-purple-500',
    ultra_rare: 'text-amber-500',
  };
  return colors[tier] || 'text-foreground';
};

export const getTierBorderColor = (tier: string): string => {
  const colors: Record<string, string> = {
    common: 'border-foreground-secondary',
    uncommon: 'border-green-500',
    rare: 'border-blue-500',
    super_rare: 'border-purple-500',
    ultra_rare: 'border-amber-500',
  };
  return colors[tier] || 'border-foreground';
};

export const getTierBgColor = (tier: string): string => {
  const colors: Record<string, string> = {
    common: 'bg-muted',
    uncommon: 'bg-green-500/10',
    rare: 'bg-blue-500/10',
    super_rare: 'bg-purple-500/10',
    ultra_rare: 'bg-amber-500/10',
  };
  return colors[tier] || 'bg-muted';
};

export const getCriteriaLabel = (key: string): string => {
  const labels: Record<string, string> = {
    rarity: 'Raridade / Tiragem',
    exclusivity: 'Exclusividade / Licença',
    condition: 'Condição',
    manufacturer: 'Fabricante',
    scale: 'Escala',
    age: 'Idade',
    origin: 'Origem',
  };
  return labels[key] || key;
};

export const getScorePercentage = (score: number, max: number): number => {
  if (!max) return 0;
  return Math.round((score / max) * 100);
};

export const getRarityTier = (score: number): string => {
  if (score >= 85) return 'ultra_rare';
  if (score >= 70) return 'super_rare';
  if (score >= 50) return 'rare';
  if (score >= 30) return 'uncommon';
  return 'common';
};

export interface MarketValue {
  min: number;
  max: number;
  currency: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

export const formatBRL = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const getConfidenceLabel = (confidence: string): string => {
  const labels: Record<string, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  return labels[confidence] || confidence;
};

export const getConfidenceColor = (confidence: string): string => {
  const colors: Record<string, string> = {
    high: 'text-green-500',
    medium: 'text-amber-500',
    low: 'text-red-400',
  };
  return colors[confidence] || 'text-muted-foreground';
};

const CRITERIA_MAX: Record<string, number> = { rarity: 35, exclusivity: 15, condition: 15, manufacturer: 15, scale: 10, age: 10 };

/** Accepts any stored breakdown shape (object, numbers only, JSON string) and returns score/max/reason per criterion. */
export const normalizeBreakdown = (raw: unknown): PriceIndexBreakdown | null => {
  let src = raw;
  if (typeof src === 'string') { try { src = JSON.parse(src); } catch { return null; } }
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null;
  const out: Record<string, IndexBreakdownItem> = {};
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
    const defMax = CRITERIA_MAX[k] ?? 10;
    if (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))) {
      out[k] = { score: Number(v), max: defMax, reason: '' };
    } else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      out[k] = { score: Number(o.score) || 0, max: Number(o.max) || defMax, reason: typeof o.reason === 'string' ? o.reason : '' };
    }
  }
  return out.rarity || Object.keys(out).length ? (out as unknown as PriceIndexBreakdown) : null;
};
