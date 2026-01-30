const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NewsArticle {
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
  language: string;
  tags: string[];
}

interface RSSItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  enclosure?: { url?: string };
  'media:content'?: { url?: string };
  'media:thumbnail'?: { url?: string };
}

// Simple RSS parser
function parseRSSXML(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemMatches = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
  
  for (const itemXml of itemMatches) {
    const getTagContent = (tag: string): string | undefined => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')) ||
                    itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return match ? match[1].trim() : undefined;
    };
    
    const getAttr = (tag: string, attr: string): string | undefined => {
      const match = itemXml.match(new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i'));
      return match ? match[1] : undefined;
    };

    items.push({
      title: getTagContent('title'),
      description: getTagContent('description') || getTagContent('content:encoded'),
      link: getTagContent('link'),
      pubDate: getTagContent('pubDate') || getTagContent('dc:date'),
      enclosure: { url: getAttr('enclosure', 'url') },
      'media:content': { url: getAttr('media:content', 'url') },
      'media:thumbnail': { url: getAttr('media:thumbnail', 'url') },
    });
  }
  
  return items;
}

// Extract image from HTML content
function extractImageFromHTML(html: string): string | null {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : null;
}

// Clean HTML tags from text
function cleanHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchRSSFeed(source: {
  name: string;
  rss_url: string;
  category: string;
  language: string;
  logo_url?: string;
}): Promise<NewsArticle[]> {
  try {
    console.log(`Fetching RSS: ${source.rss_url}`);
    const response = await fetch(source.rss_url, {
      headers: { 'User-Agent': 'Paddock News Aggregator/1.0' }
    });
    
    if (!response.ok) {
      console.error(`RSS fetch failed for ${source.name}: ${response.status}`);
      return [];
    }
    
    const xml = await response.text();
    const items = parseRSSXML(xml);
    
    return items.slice(0, 10).map(item => {
      const description = item.description || '';
      const imageUrl = item.enclosure?.url || 
                       item['media:content']?.url || 
                       item['media:thumbnail']?.url ||
                       extractImageFromHTML(description);
      
      return {
        title: item.title || 'Untitled',
        summary: cleanHTML(description).substring(0, 300),
        content: null,
        image_url: imageUrl,
        source_url: item.link || '',
        source_name: source.name,
        source_logo: source.logo_url || null,
        category: source.category,
        subcategory: null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        language: source.language,
        tags: [],
      };
    }).filter(a => a.source_url);
  } catch (error) {
    console.error(`Error fetching RSS ${source.name}:`, error);
    return [];
  }
}

async function fetchFirecrawlNews(
  query: string,
  category: string,
  language: string
): Promise<NewsArticle[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('FIRECRAWL_API_KEY not configured, skipping Firecrawl search');
    return [];
  }

  try {
    console.log(`Firecrawl search: ${query}`);
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 5,
        lang: language === 'pt' ? 'pt-BR' : 'en',
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    if (!response.ok) {
      console.error(`Firecrawl search failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.success || !data.data) {
      return [];
    }

    return data.data.map((result: any) => ({
      title: result.title || 'Untitled',
      summary: result.description || (result.markdown ? result.markdown.substring(0, 300) : null),
      content: result.markdown || null,
      image_url: result.ogImage || result.screenshot || null,
      source_url: result.url,
      source_name: new URL(result.url).hostname.replace('www.', ''),
      source_logo: null,
      category,
      subcategory: null,
      published_at: null,
      language,
      tags: [],
    }));
  } catch (error) {
    console.error('Firecrawl search error:', error);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, language = 'pt', forceRefresh = false } = await req.json().catch(() => ({}));
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Check cache - if we have recent articles, return them
    if (!forceRefresh) {
      const cacheCheck = await fetch(
        `${supabaseUrl}/rest/v1/news_articles?select=fetched_at&order=fetched_at.desc&limit=1`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        }
      );
      
      if (cacheCheck.ok) {
        const cached = await cacheCheck.json();
        if (cached.length > 0) {
          const lastFetch = new Date(cached[0].fetched_at);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          
          if (lastFetch > hourAgo) {
            console.log('Using cached articles');
            // Return cached articles
            let query = `${supabaseUrl}/rest/v1/news_articles?select=*&order=published_at.desc.nullslast,fetched_at.desc&limit=50`;
            if (category) query += `&category=eq.${category}`;
            if (language && language !== 'all') query += `&language=eq.${language}`;
            
            const articlesRes = await fetch(query, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              },
            });
            
            const articles = await articlesRes.json();
            return new Response(
              JSON.stringify({ success: true, articles, from_cache: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Fetch news sources
    const sourcesRes = await fetch(
      `${supabaseUrl}/rest/v1/news_sources?select=*&is_active=eq.true`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    
    const sources = await sourcesRes.json();
    console.log(`Found ${sources.length} active sources`);

    const allArticles: NewsArticle[] = [];

    // Process RSS sources
    const rssSources = sources.filter((s: any) => s.fetch_method === 'rss' && s.rss_url);
    for (const source of rssSources) {
      if (category && source.category !== category) continue;
      const articles = await fetchRSSFeed(source);
      allArticles.push(...articles);
    }

    // Process Firecrawl sources
    const firecrawlSources = sources.filter((s: any) => s.fetch_method === 'firecrawl');
    for (const source of firecrawlSources) {
      if (category && source.category !== category) continue;
      
      const searchQueries: Record<string, string> = {
        collectibles: 'hot wheels diecast news 2024 2025',
        motorsport: 'formula 1 racing news',
        cars: 'new car releases automotive news',
        aeromodeling: 'RC airplane drone model news',
        planes: 'aviation aircraft news',
      };
      
      const query = searchQueries[source.category] || `${source.category} news`;
      const articles = await fetchFirecrawlNews(query, source.category, source.language);
      allArticles.push(...articles);
    }

    console.log(`Fetched ${allArticles.length} articles total`);

    // Remove duplicates by source_url before upserting
    const uniqueArticlesMap = new Map<string, NewsArticle>();
    for (const article of allArticles) {
      if (article.source_url && !uniqueArticlesMap.has(article.source_url)) {
        uniqueArticlesMap.set(article.source_url, article);
      }
    }
    const uniqueArticles = Array.from(uniqueArticlesMap.values());
    console.log(`Unique articles after deduplication: ${uniqueArticles.length}`);

    // Upsert articles to database
    if (uniqueArticles.length > 0) {
      const upsertRes = await fetch(
        `${supabaseUrl}/rest/v1/news_articles?on_conflict=source_url`,
        {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(uniqueArticles.map(a => ({
            ...a,
            fetched_at: new Date().toISOString(),
          }))),
        }
      );
      
      if (!upsertRes.ok) {
        console.error('Failed to upsert articles:', await upsertRes.text());
      } else {
        console.log('Articles upserted successfully');
      }
    }

    // Return fresh articles
    let articlesQuery = `${supabaseUrl}/rest/v1/news_articles?select=*&order=published_at.desc.nullslast,fetched_at.desc&limit=50`;
    if (category) articlesQuery += `&category=eq.${category}`;
    
    const finalRes = await fetch(articlesQuery, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    const finalArticles = await finalRes.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        articles: finalArticles,
        from_cache: false,
        fetched_count: allArticles.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
