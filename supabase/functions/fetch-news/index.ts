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

    // Try multiple image sources in RSS
    const enclosureUrl = getAttr('enclosure', 'url');
    const mediaContentUrl = getAttr('media:content', 'url');
    const mediaThumbnailUrl = getAttr('media:thumbnail', 'url');
    const imageUrl = getAttr('image', 'url') || getTagContent('image');
    const itunesImageUrl = getAttr('itunes:image', 'href');

    items.push({
      title: getTagContent('title'),
      description: getTagContent('description') || getTagContent('content:encoded'),
      link: getTagContent('link'),
      pubDate: getTagContent('pubDate') || getTagContent('dc:date'),
      enclosure: { url: enclosureUrl },
      'media:content': { url: mediaContentUrl },
      'media:thumbnail': { url: mediaThumbnailUrl || imageUrl || itunesImageUrl },
    });
  }
  
  return items;
}

// Extract image from HTML content - improved version
function extractImageFromHTML(html: string): string | null {
  // Try standard img tags
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && isValidImageUrl(imgMatch[1])) {
    return imgMatch[1];
  }
  
  // Try figure/picture elements
  const figureMatch = html.match(/<figure[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
  if (figureMatch && isValidImageUrl(figureMatch[1])) {
    return figureMatch[1];
  }
  
  // Try data-src (lazy loading)
  const dataSrcMatch = html.match(/<img[^>]+data-src=["']([^"']+)["']/i);
  if (dataSrcMatch && isValidImageUrl(dataSrcMatch[1])) {
    return dataSrcMatch[1];
  }
  
  return null;
}

// Validate image URL
function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  // Exclude small icons, tracking pixels, etc.
  const excluded = ['1x1', 'pixel', 'tracking', 'blank', 'spacer', 'avatar', 'icon', 'logo', 'favicon'];
  const lowerUrl = url.toLowerCase();
  return !excluded.some(ex => lowerUrl.includes(ex)) && 
         (url.startsWith('http://') || url.startsWith('https://'));
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

// Fetch og:image from article URL
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Paddock News Bot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Try og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && isValidImageUrl(ogMatch[1])) {
      return ogMatch[1];
    }
    
    // Try twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twitterMatch && isValidImageUrl(twitterMatch[1])) {
      return twitterMatch[1];
    }
    
    // Try first large image in article
    const imgMatch = html.match(/<article[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && isValidImageUrl(imgMatch[1])) {
      return imgMatch[1];
    }
    
    return null;
  } catch (error) {
    console.log(`Failed to fetch og:image for ${url}:`, error);
    return null;
  }
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
    
    // Process items and try to get images
    const processedItems: NewsArticle[] = [];
    
    for (const item of items.slice(0, 10)) {
      if (!item.link) continue;
      
      const description = item.description || '';
      let imageUrl = item.enclosure?.url || 
                     item['media:content']?.url || 
                     item['media:thumbnail']?.url ||
                     extractImageFromHTML(description);
      
      // If no image found in RSS, try to fetch og:image from the article
      if (!imageUrl || !isValidImageUrl(imageUrl)) {
        imageUrl = await fetchOgImage(item.link);
      }
      
      // Skip articles without valid images
      if (!imageUrl || !isValidImageUrl(imageUrl)) {
        console.log(`Skipping RSS article without image: ${item.title}`);
        continue;
      }
      
      processedItems.push({
        title: item.title || 'Untitled',
        summary: cleanHTML(description).substring(0, 300),
        content: null,
        image_url: imageUrl,
        source_url: item.link,
        source_name: source.name,
        source_logo: source.logo_url || null,
        category: source.category,
        subcategory: null,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        language: source.language,
        tags: [],
      });
    }
    
    return processedItems;
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

    const articlesWithImages: NewsArticle[] = [];
    
    for (const result of data.data) {
      let imageUrl = result.ogImage || result.screenshot || null;
      
      // If no image from Firecrawl, try to fetch og:image from the article
      if (!imageUrl && result.url) {
        imageUrl = await fetchOgImage(result.url);
      }
      
      // Skip articles without images
      if (!imageUrl) {
        console.log(`Skipping article without image: ${result.title}`);
        continue;
      }
      
      articlesWithImages.push({
        title: result.title || 'Untitled',
        summary: result.description || (result.markdown ? result.markdown.substring(0, 300) : null),
        content: result.markdown || null,
        image_url: imageUrl,
        source_url: result.url,
        source_name: new URL(result.url).hostname.replace('www.', ''),
        source_logo: null,
        category,
        subcategory: null,
        published_at: null,
        language,
        tags: [],
      });
    }
    
    return articlesWithImages;
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
      
      // Custom queries per source for better results
      const sourceQueries: Record<string, string> = {
        'autoesporte': 'site:autoesporte.globo.com carros lançamentos 2025',
        'quatrorodas': 'site:quatrorodas.abril.com.br novos carros testes',
        'flatout': 'site:flatout.com.br carros clássicos esportivos',
        'ge-motor': 'site:ge.globo.com/motor F1 automobilismo 2025',
        'hotwheels-br': 'hot wheels brasil novidades lançamentos 2025',
        'lamley': 'site:lamleygroup.com hot wheels diecast news',
        'thunted': 'T-Hunted hot wheels brasil colecionáveis',
      };
      
      const categoryQueries: Record<string, string> = {
        collectibles: 'hot wheels diecast colecionáveis miniaturas news 2024 2025',
        motorsport: 'formula 1 automobilismo racing news 2025',
        cars: 'novos carros lançamentos brasil testes 2025',
      };
      
      const query = sourceQueries[source.code] || categoryQueries[source.category] || `${source.category} news`;
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
