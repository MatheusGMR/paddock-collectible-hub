export interface MarketplaceSource {
  code: string;
  name: string;
  url: string;
  country: string;
  category: 'marketplace' | 'specialized' | 'wholesale' | 'official' | 'internal';
  flag: string;
}

export const marketplaceSources: MarketplaceSource[] = [
  // Brasil - Marketplaces
  { code: 'olx', name: 'OLX', url: 'https://olx.com.br', country: 'BR', category: 'marketplace', flag: '🇧🇷' },
  { code: 'mercadolivre', name: 'Mercado Livre', url: 'https://mercadolivre.com.br', country: 'BR', category: 'marketplace', flag: '🇧🇷' },
  { code: 'shopee', name: 'Shopee Brasil', url: 'https://shopee.com.br', country: 'BR', category: 'marketplace', flag: '🇧🇷' },
  // Brasil - Especializadas
  { code: 'escala_miniaturas', name: 'Escala Miniaturas', url: 'https://escalaminiaturas.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'orangebox', name: 'Orangebox Miniaturas', url: 'https://orangeboxminiaturas.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'semaan', name: 'Semaan', url: 'https://semaanbrinquedos.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'minimundi', name: 'MiniMundi', url: 'https://minimundi.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'mgminis', name: 'MG Minis', url: 'https://mgminis.com', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'automotivo', name: 'AutoMOTIVO Store', url: 'https://automotivostore.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'wale', name: 'Wale Miniaturas', url: 'https://shopee.com.br/wale_miniaturas', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'coleciona', name: 'Coleciona Brinquedos', url: 'https://coleciona.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  { code: 'limahobbies', name: 'Lima Hobbies', url: 'https://limahobbies.com.br', country: 'BR', category: 'specialized', flag: '🇧🇷' },
  // EUA
  { code: 'jcardiecast', name: 'Jcar Diecast', url: 'https://jcardiecast.com', country: 'US', category: 'specialized', flag: '🇺🇸' },
  { code: 'diecastwholesale', name: 'Diecast Models Wholesale', url: 'https://diecastmodelswholesale.com', country: 'US', category: 'wholesale', flag: '🇺🇸' },
  { code: 'mattel_rlc', name: 'Mattel Creations (RLC)', url: 'https://creations.mattel.com', country: 'US', category: 'official', flag: '🇺🇸' },
  { code: 'ajtoys', name: 'A&J Toys', url: 'https://aandjtoys.com', country: 'US', category: 'specialized', flag: '🇺🇸' },
  { code: 'ebay', name: 'eBay', url: 'https://ebay.com', country: 'US', category: 'marketplace', flag: '🇺🇸' },
  // Ásia
  { code: 'aliexpress', name: 'AliExpress', url: 'https://aliexpress.com', country: 'CN', category: 'marketplace', flag: '🇨🇳' },
  { code: 'hobbysearch', name: 'Hobby Search', url: 'https://1999.co.jp/eng', country: 'JP', category: 'specialized', flag: '🇯🇵' },
  { code: 'amiami', name: 'AmiAmi', url: 'https://amiami.com', country: 'JP', category: 'specialized', flag: '🇯🇵' },
  { code: 'plazajapan', name: 'Plaza Japan', url: 'https://plazajapan.com', country: 'JP', category: 'specialized', flag: '🇯🇵' },
  { code: 'rcmart', name: 'rcMart', url: 'https://rcmart.com', country: 'CN', category: 'specialized', flag: '🇨🇳' },
  // Paddock (interno)
  { code: 'paddock', name: 'Paddock', url: 'https://paddock.app', country: 'BR', category: 'internal', flag: '🏁' },
];

export const getSourceByCode = (code: string): MarketplaceSource | undefined => {
  return marketplaceSources.find(s => s.code === code);
};

export const getSourcesByCountry = (country: string): MarketplaceSource[] => {
  return marketplaceSources.filter(s => s.country === country);
};

export const getSourcesByCategory = (category: string): MarketplaceSource[] => {
  return marketplaceSources.filter(s => s.category === category);
};

export const countryLabels: Record<string, string> = {
  BR: 'Brasil',
  US: 'Estados Unidos',
  JP: 'Japão',
  CN: 'China',
};

export const categoryLabels: Record<string, string> = {
  marketplace: 'Marketplaces',
  specialized: 'Especializadas',
  wholesale: 'Atacado',
  official: 'Oficiais',
  internal: 'Paddock',
};

export const currencySymbols: Record<string, string> = {
  BRL: 'R$',
  USD: '$',
  JPY: '¥',
  CNY: '¥',
};

export const formatPrice = (price: number, currency: string): string => {
  const symbol = currencySymbols[currency] || currency;
  
  if (currency === 'BRL') {
    return `${symbol} ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  
  if (currency === 'JPY' || currency === 'CNY') {
    return `${symbol} ${price.toLocaleString('ja-JP', { minimumFractionDigits: 0 })}`;
  }
  
  return `${symbol} ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
};
