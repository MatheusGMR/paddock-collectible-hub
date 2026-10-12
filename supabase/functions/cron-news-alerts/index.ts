import { admin, sendToUsers } from '../_shared/push.ts';

async function pushLaunch(p: { title: string; body: string; url: string; image?: string | null }) {
  const { data } = await admin().rpc('get_push_audience', { p_audience: { type: 'topic', topic: 'launches' } });
  return sendToUsers((data || []).map((r: any) => r.user_id), { ...p, tag: 'launches' }, { triggerKey: 'news_launch' });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detect if article is a launch based on title/summary keywords
function isLaunchArticle(title: string, summary: string | null): boolean {
  const launchKeywords = [
    // Portuguese
    'lançamento', 'lançamentos', 'lança', 'lançou', 'lançará',
    'novo', 'nova', 'novos', 'novas', 'novidade', 'novidades',
    'estreia', 'estreou', 'revelado', 'revelação', 'apresenta',
    'chega ao brasil', 'chega às lojas', 'disponível',
    // English
    'launch', 'launches', 'launched', 'launching',
    'new', 'reveal', 'revealed', 'unveil', 'unveiled',
    'release', 'released', 'releases', 'debut', 'debuts',
    'introducing', 'announces', 'announcement',
    // Brand specific
    'hot wheels', 'tomica', 'matchbox', 'majorette', 'greenlight',
    'mainline', 'super treasure hunt', 'sth', 'case',
  ];
  
  const text = `${title} ${summary || ''}`.toLowerCase();
  return launchKeywords.some(keyword => text.includes(keyword.toLowerCase()));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    console.log('🕗 Cron job started: Fetching news and sending alerts...');
    
    // Step 1: Get latest article timestamp before fetching
    const lastArticleRes = await fetch(
      `${supabaseUrl}/rest/v1/news_articles?select=fetched_at&order=fetched_at.desc&limit=1`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    
    let lastFetchTime: Date | null = null;
    if (lastArticleRes.ok) {
      const lastArticle = await lastArticleRes.json();
      if (lastArticle.length > 0) {
        lastFetchTime = new Date(lastArticle[0].fetched_at);
      }
    }
    
    // Step 2: Force refresh news
    console.log('📰 Fetching fresh news...');
    const fetchNewsRes = await fetch(
      `${supabaseUrl}/functions/v1/fetch-news`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ forceRefresh: true }),
      }
    );
    
    if (!fetchNewsRes.ok) {
      console.error('Failed to fetch news:', await fetchNewsRes.text());
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch news' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const newsData = await fetchNewsRes.json();
    console.log(`✅ Fetched ${newsData.fetched_count || 0} articles`);
    
    // Step 3: Find new articles that are launches
    let newLaunchQuery = `${supabaseUrl}/rest/v1/news_articles?select=id,title,summary,image_url,source_url`;
    if (lastFetchTime) {
      newLaunchQuery += `&fetched_at=gt.${lastFetchTime.toISOString()}`;
    }
    newLaunchQuery += '&limit=20';
    
    const newArticlesRes = await fetch(newLaunchQuery, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });
    
    const newArticles = await newArticlesRes.json();
    console.log(`🆕 Found ${newArticles.length} new articles since last fetch`);
    
    // Filter for launch articles
    const launchArticles = newArticles.filter((article: any) => 
      isLaunchArticle(article.title, article.summary)
    );
    
    console.log(`🚀 ${launchArticles.length} are launch-related`);
    
    // Step 4: Mark articles as launches in database
    if (launchArticles.length > 0) {
      for (const article of launchArticles) {
        await fetch(
          `${supabaseUrl}/rest/v1/news_articles?id=eq.${article.id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_launch: true }),
          }
        );
      }
    }
    
    // Step 5: Send push notifications for launches
    let pushSent = 0;
    
    if (launchArticles.length > 0) {
      // Group multiple launches into one notification if many
      if (launchArticles.length >= 3) {
        // Send summary notification
        const pushResult = await pushLaunch({
              title: '🚗 Novos Lançamentos!',
              body: `${launchArticles.length} novidades para você conferir`,
              url: '/mercado',
              
            });
          {
            pushSent = pushResult.sent || 0;
          console.log(`📲 Summary push sent to ${pushSent} users`);
        }
      } else {
        // Send individual notifications for each launch
        for (const article of launchArticles) {
          const pushResult = await pushLaunch({
                title: '🆕 Novo Lançamento',
                body: article.title.substring(0, 100),
                image: article.image_url,
                url: article.source_url,
                
                
              });
          {
            pushSent += pushResult.sent || 0;
          }
        }
        console.log(`📲 Individual pushes sent: ${pushSent} total`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        articles_fetched: newsData.fetched_count || 0,
        new_articles: newArticles.length,
        launch_articles: launchArticles.length,
        push_notifications_sent: pushSent,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cron job error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
