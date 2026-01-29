export interface IndexBreakdownItem {
  score: number;
  max: number;
  reason: string;
}

export interface PriceIndexBreakdown {
  rarity: IndexBreakdownItem;
  condition: IndexBreakdownItem;
  manufacturer: IndexBreakdownItem;
  scale: IndexBreakdownItem;
  age: IndexBreakdownItem;
  origin: IndexBreakdownItem;
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
    rarity: 'Raridade',
    condition: 'Condição',
    manufacturer: 'Fabricante',
    scale: 'Escala',
    age: 'Idade',
    origin: 'Origem',
  };
  return labels[key] || key;
};

export const getScorePercentage = (score: number, max: number): number => {
  return Math.round((score / max) * 100);
};
