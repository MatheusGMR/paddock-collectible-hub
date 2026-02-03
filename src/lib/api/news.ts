import { supabase } from '@/integrations/supabase/client';

export interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  source_url: string;
  source_name: string;
  source_logo: string | null;
  category: string;
  subcategory: string | null;
  published_at: string | null;
  fetched_at: string;
  language: string;
  tags: string[] | null;
  is_featured: boolean;
  view_count: number;
}

export interface NewsPreferences {
  id: string;
  user_id: string;
  categories: string[];
  subcategories: string[] | null;
  sources: string[] | null;
  language: string;
  notifications_enabled: boolean;
}

export interface NewsSource {
  id: string;
  name: string;
  code: string;
  url: string;
  rss_url: string | null;
  logo_url: string | null;
  category: string;
  language: string;
  is_active: boolean;
  fetch_method: string;
}

// Valid categories (excluding aeromodeling and planes)
const VALID_CATEGORIES = ['collectibles', 'motorsport', 'cars'];

// Normalize title for duplicate detection
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6) // Compare first 6 words
    .join(' ');
}

// Check if two articles are duplicates
function areDuplicates(a: NewsArticle, b: NewsArticle): boolean {
  const normA = normalizeTitle(a.title);
  const normB = normalizeTitle(b.title);
  
  // Check for significant overlap
  if (normA === normB) return true;
  
  // Check if one contains the other (for shortened titles)
  if (normA.includes(normB) || normB.includes(normA)) return true;
  
  // Check word overlap (if 70%+ words match, likely duplicate)
  const wordsA = normA.split(' ');
  const wordsB = normB.split(' ');
  const commonWords = wordsA.filter(w => wordsB.includes(w) && w.length > 3);
  const overlapRatio = commonWords.length / Math.min(wordsA.length, wordsB.length);
  
  return overlapRatio >= 0.7;
}

// Remove duplicate articles, keeping Portuguese version when available
function deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
  const seen: NewsArticle[] = [];
  
  for (const article of articles) {
    const duplicate = seen.find(s => areDuplicates(s, article));
    
    if (!duplicate) {
      seen.push(article);
    } else if (article.language === 'pt' && duplicate.language !== 'pt') {
      // Replace with Portuguese version
      const idx = seen.indexOf(duplicate);
      seen[idx] = article;
    }
    // If duplicate exists and current isn't Portuguese, skip it
  }
  
  return seen;
}

// Fetch news articles from database with Portuguese priority and deduplication
export async function getNewsArticles(options: {
  category?: string | null;
  language?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  const { category, limit = 20, offset = 0, search } = options;
  
  // Fetch more articles to account for deduplication
  const fetchLimit = limit * 2;
  
  // If a specific category is selected, fetch normally
  if (category) {
    // Fetch Portuguese articles first
    let ptQuery = supabase
      .from('news_articles')
      .select('*')
      .eq('category', category)
      .eq('language', 'pt')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(offset, offset + fetchLimit);
    
    if (search) {
      ptQuery = ptQuery.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }
    
    // Fetch English articles as fallback
    let enQuery = supabase
      .from('news_articles')
      .select('*')
      .eq('category', category)
      .eq('language', 'en')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(offset, offset + fetchLimit);
    
    if (search) {
      enQuery = enQuery.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }
    
    const [ptResult, enResult] = await Promise.all([ptQuery, enQuery]);
    
    if (ptResult.error) {
      console.error('Error fetching PT news:', ptResult.error);
      throw ptResult.error;
    }
    
    // Combine: Portuguese first, then English
    const combined = [...(ptResult.data || []), ...(enResult.data || [])];
    
    // Remove duplicates
    const deduplicated = deduplicateArticles(combined);
    
    // Sort by date, Portuguese first for same date
    const sorted = deduplicated.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      
      // If same day, prioritize Portuguese
      if (Math.abs(dateA - dateB) < 86400000) { // Within 24h
        if (a.language === 'pt' && b.language !== 'pt') return -1;
        if (b.language === 'pt' && a.language !== 'pt') return 1;
      }
      
      return dateB - dateA;
    });
    
    return {
      articles: sorted.slice(0, limit),
      hasMore: sorted.length > limit,
    };
  }
  
  // For "all" category, fetch balanced from each category with PT priority
  const perCategory = Math.ceil(fetchLimit / 3);
  const categoryOffset = Math.floor(offset / 3);
  
  const fetchCategory = async (cat: string) => {
    // Fetch Portuguese first
    const ptQuery = supabase
      .from('news_articles')
      .select('*')
      .eq('category', cat)
      .eq('language', 'pt')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(categoryOffset, categoryOffset + perCategory);
    
    // Fetch English as fallback
    const enQuery = supabase
      .from('news_articles')
      .select('*')
      .eq('category', cat)
      .eq('language', 'en')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(categoryOffset, categoryOffset + perCategory);
    
    const [ptResult, enResult] = await Promise.all([ptQuery, enQuery]);
    
    // Combine and deduplicate
    const combined = [...(ptResult.data || []), ...(enResult.data || [])];
    return deduplicateArticles(combined);
  };
  
  // Fetch from all 3 categories in parallel
  const [collectibles, motorsport, cars] = await Promise.all([
    fetchCategory('collectibles'),
    fetchCategory('motorsport'),
    fetchCategory('cars'),
  ]);
  
  // Interleave articles for balanced display
  const combined: NewsArticle[] = [];
  const maxLen = Math.max(collectibles.length, motorsport.length, cars.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (collectibles[i]) combined.push(collectibles[i]);
    if (motorsport[i]) combined.push(motorsport[i]);
    if (cars[i]) combined.push(cars[i]);
  }
  
  // Final deduplication across categories
  const deduplicated = deduplicateArticles(combined);
  
  // Sort by date with Portuguese priority
  const sorted = deduplicated.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    
    // If same day, prioritize Portuguese
    if (Math.abs(dateA - dateB) < 86400000) {
      if (a.language === 'pt' && b.language !== 'pt') return -1;
      if (b.language === 'pt' && a.language !== 'pt') return 1;
    }
    
    return dateB - dateA;
  });
  
  return {
    articles: sorted.slice(0, limit),
    hasMore: sorted.length > limit,
  };
}

// Fetch featured articles
export async function getFeaturedArticles(limit = 3): Promise<NewsArticle[]> {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching featured news:', error);
    // Fall back to most recent articles
    const fallback = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    
    return fallback.data || [];
  }
  
  // If no featured, return most recent
  if (!data || data.length === 0) {
    const fallback = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    
    return fallback.data || [];
  }
  
  return data;
}

// Refresh news from sources
export async function refreshNews(category?: string): Promise<void> {
  const { error } = await supabase.functions.invoke('fetch-news', {
    body: { category, forceRefresh: true },
  });
  
  if (error) {
    console.error('Error refreshing news:', error);
    throw error;
  }
}

// Get user preferences
export async function getUserNewsPreferences(userId: string): Promise<NewsPreferences | null> {
  const { data, error } = await supabase
    .from('user_news_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found
      return null;
    }
    console.error('Error fetching preferences:', error);
    throw error;
  }
  
  return data;
}

// Save user preferences
export async function saveUserNewsPreferences(
  userId: string,
  preferences: Partial<Omit<NewsPreferences, 'id' | 'user_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('user_news_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  
  if (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
}

// Get available news sources
export async function getNewsSources(): Promise<NewsSource[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) {
    console.error('Error fetching sources:', error);
    throw error;
  }
  
  return data || [];
}

// Increment view count for an article (optional enhancement - requires database function)
export async function incrementViewCount(articleId: string): Promise<void> {
  // This would require a database function to work properly
  // For now, we'll skip this as it's not critical
  console.log('View count increment for:', articleId);
}

// Format relative time
export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
