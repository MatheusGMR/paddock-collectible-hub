import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, artist } = await req.json();

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      console.error('YOUTUBE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'YouTube API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query - prioritize official audio/video
    const searchQuery = `${title} ${artist || ''} official audio`.trim();
    const encodedQuery = encodeURIComponent(searchQuery);

    console.log(`Searching YouTube for: ${searchQuery}`);

    const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodedQuery}&key=${YOUTUBE_API_KEY}&maxResults=1`;

    const response = await fetch(youtubeUrl);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return new Response(
        JSON.stringify({ error: 'YouTube search failed', details: data.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data.items || data.items.length === 0) {
      console.log('No videos found');
      return new Response(
        JSON.stringify({ videoId: null, message: 'No videos found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const video = data.items[0];
    const videoId = video.id.videoId;
    const videoTitle = video.snippet.title;
    const thumbnail = video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url;

    console.log(`Found video: ${videoTitle} (${videoId})`);

    return new Response(
      JSON.stringify({
        videoId,
        title: videoTitle,
        thumbnail,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in youtube-search:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
