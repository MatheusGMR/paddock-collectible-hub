-- Insert Reddit subreddits as news sources
INSERT INTO public.news_sources (name, code, url, rss_url, category, language, fetch_method, is_active)
VALUES
  -- Collectibles
  ('Reddit Hot Wheels', 'reddit-hotwheels', 'https://www.reddit.com/r/HotWheels/', 'https://www.reddit.com/r/HotWheels/.rss', 'collectibles', 'en', 'rss', true),
  ('Reddit Diecast', 'reddit-diecast', 'https://www.reddit.com/r/Diecast/', 'https://www.reddit.com/r/Diecast/.rss', 'collectibles', 'en', 'rss', true),
  ('Reddit Matchbox', 'reddit-matchbox', 'https://www.reddit.com/r/matchbox/', 'https://www.reddit.com/r/matchbox/.rss', 'collectibles', 'en', 'rss', true),
  
  -- Cars
  ('Reddit Cars', 'reddit-cars', 'https://www.reddit.com/r/cars/', 'https://www.reddit.com/r/cars/.rss', 'cars', 'en', 'rss', true),
  ('Reddit Autos', 'reddit-autos', 'https://www.reddit.com/r/Autos/', 'https://www.reddit.com/r/Autos/.rss', 'cars', 'en', 'rss', true),
  
  -- Motorsport
  ('Reddit Formula 1', 'reddit-f1', 'https://www.reddit.com/r/formula1/', 'https://www.reddit.com/r/formula1/.rss', 'motorsport', 'en', 'rss', true),
  ('Reddit NASCAR', 'reddit-nascar', 'https://www.reddit.com/r/NASCAR/', 'https://www.reddit.com/r/NASCAR/.rss', 'motorsport', 'en', 'rss', true)
ON CONFLICT (code) DO NOTHING;