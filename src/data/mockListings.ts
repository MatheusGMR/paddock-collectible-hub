import { Listing } from "@/components/mercado/ListingCard";

// Mock listings representing various sources
export const mockListings: Listing[] = [
  // Paddock (interno)
  {
    id: "1",
    title: "Hot Wheels Premium - Nissan Skyline GT-R R34",
    description: "Miniatura em perfeito estado, lacrada",
    price: 89.90,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400",
    source: "paddock",
    source_name: "Paddock",
    source_country: "BR",
    created_at: new Date().toISOString(),
    user_id: "user-123",
  },
  // OLX
  {
    id: "2",
    title: "Ferrari 250 GTO - Hot Wheels Legends",
    description: "Raridade, edição limitada 2023",
    price: 450.00,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400",
    source: "olx",
    source_name: "OLX",
    source_country: "BR",
    external_url: "https://olx.com.br",
    created_at: new Date().toISOString(),
  },
  // Mercado Livre
  {
    id: "3",
    title: "Mini GT - Lamborghini Aventador SVJ",
    description: "1:64, nova na caixa",
    price: 159.90,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    source: "mercadolivre",
    source_name: "Mercado Livre",
    source_country: "BR",
    external_url: "https://mercadolivre.com.br",
    created_at: new Date().toISOString(),
  },
  // Escala Miniaturas
  {
    id: "4",
    title: "Porsche 911 GT3 RS - Minichamps 1:43",
    description: "Edição especial, detalhamento premium",
    price: 289.00,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400",
    source: "escala_miniaturas",
    source_name: "Escala Miniaturas",
    source_country: "BR",
    external_url: "https://escalaminiaturas.com.br",
    created_at: new Date().toISOString(),
  },
  // eBay
  {
    id: "5",
    title: "McLaren Senna - Tarmac Works 1:64",
    description: "Global64 series, limited edition",
    price: 42.99,
    currency: "USD",
    image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400",
    source: "ebay",
    source_name: "eBay",
    source_country: "US",
    external_url: "https://ebay.com",
    created_at: new Date().toISOString(),
  },
  // Mattel RLC
  {
    id: "6",
    title: "RLC Exclusive - 1971 Datsun 510",
    description: "Red Line Club members exclusive",
    price: 28.00,
    currency: "USD",
    image_url: "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400",
    source: "mattel_rlc",
    source_name: "Mattel Creations (RLC)",
    source_country: "US",
    external_url: "https://creations.mattel.com",
    created_at: new Date().toISOString(),
  },
  // AliExpress
  {
    id: "7",
    title: "Bburago Ferrari LaFerrari 1:18",
    description: "High quality diecast model",
    price: 189.00,
    currency: "CNY",
    image_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400",
    source: "aliexpress",
    source_name: "AliExpress",
    source_country: "CN",
    external_url: "https://aliexpress.com",
    created_at: new Date().toISOString(),
  },
  // Hobby Search Japan
  {
    id: "8",
    title: "Tomica Limited Vintage - Nissan Fairlady Z",
    description: "TLV Neo series, made in Japan",
    price: 3200,
    currency: "JPY",
    image_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400",
    source: "hobbysearch",
    source_name: "Hobby Search",
    source_country: "JP",
    external_url: "https://1999.co.jp/eng",
    created_at: new Date().toISOString(),
  },
  // Orangebox
  {
    id: "9",
    title: "Majorette - Range Rover Evoque",
    description: "Premium Cars series",
    price: 45.90,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400",
    source: "orangebox",
    source_name: "Orangebox Miniaturas",
    source_country: "BR",
    external_url: "https://orangeboxminiaturas.com.br",
    created_at: new Date().toISOString(),
  },
  // Jcar Diecast
  {
    id: "10",
    title: "INNO64 Honda Civic Type-R EK9",
    description: "Championship White, 1:64 scale",
    price: 18.99,
    currency: "USD",
    image_url: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400",
    source: "jcardiecast",
    source_name: "Jcar Diecast",
    source_country: "US",
    external_url: "https://jcardiecast.com",
    created_at: new Date().toISOString(),
  },
  // AmiAmi
  {
    id: "11",
    title: "Kyosho Mini-Z AWD - Toyota GR Supra",
    description: "Ready-to-run RC car",
    price: 15800,
    currency: "JPY",
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400",
    source: "amiami",
    source_name: "AmiAmi",
    source_country: "JP",
    external_url: "https://amiami.com",
    created_at: new Date().toISOString(),
  },
  // Shopee
  {
    id: "12",
    title: "Greenlight - Ford Mustang Boss 429",
    description: "Muscle car series, lacrado",
    price: 79.90,
    currency: "BRL",
    image_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400",
    source: "shopee",
    source_name: "Shopee Brasil",
    source_country: "BR",
    external_url: "https://shopee.com.br",
    created_at: new Date().toISOString(),
  },
];

// Function to filter and paginate mock listings
export const getMockListings = (
  options: {
    search?: string;
    country?: string | null;
    category?: string | null;
    page?: number;
    limit?: number;
  } = {}
): { listings: Listing[]; hasMore: boolean; total: number } => {
  const { search, country, category, page = 1, limit = 10 } = options;

  let filtered = [...mockListings];

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.title.toLowerCase().includes(searchLower) ||
        l.description?.toLowerCase().includes(searchLower) ||
        l.source_name.toLowerCase().includes(searchLower)
    );
  }

  // Apply country filter
  if (country) {
    filtered = filtered.filter((l) => l.source_country === country);
  }

  // Apply category filter
  if (category) {
    const categoryMap: Record<string, string[]> = {
      marketplace: ["olx", "mercadolivre", "shopee", "ebay", "aliexpress"],
      specialized: ["escala_miniaturas", "orangebox", "semaan", "minimundi", "mgminis", "automotivo", "wale", "coleciona", "limahobbies", "jcardiecast", "ajtoys", "hobbysearch", "amiami", "plazajapan", "rcmart"],
      official: ["mattel_rlc"],
      wholesale: ["diecastwholesale"],
      internal: ["paddock"],
    };

    const sourcesInCategory = categoryMap[category] || [];
    filtered = filtered.filter((l) => sourcesInCategory.includes(l.source));
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = filtered.slice(start, end);
  const hasMore = end < total;

  return { listings: paginated, hasMore, total };
};
