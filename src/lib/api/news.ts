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

// Fetch news articles from database with balanced distribution
export async function getNewsArticles(options: {
  category?: string | null;
  language?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ articles: NewsArticle[]; hasMore: boolean }> {
  const { category, language, limit = 20, offset = 0, search } = options;
  
  // If a specific category is selected, fetch normally
  if (category) {
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('category', category)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(offset, offset + limit);
    
    if (language && language !== 'all') {
      query = query.eq('language', language);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching news:', error);
      throw error;
    }
    
    return {
      articles: data || [],
      hasMore: (data?.length || 0) > limit,
    };
  }
  
  // For "all" category, fetch balanced from each category (33% each)
  const perCategory = Math.ceil(limit / 3);
  const categoryOffset = Math.floor(offset / 3);
  
  const fetchCategory = async (cat: string) => {
    let query = supabase
      .from('news_articles')
      .select('*')
      .eq('category', cat)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('fetched_at', { ascending: false })
      .range(categoryOffset, categoryOffset + perCategory);
    
    if (language && language !== 'all') {
      query = query.eq('language', language);
    }
    
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }
    
    const { data } = await query;
    return data || [];
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
  
  // Sort by published date while maintaining some category balance
  const sorted = combined.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
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
