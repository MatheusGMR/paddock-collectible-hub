import { useState, useCallback, useEffect } from "react";
import { NewsHeader } from "@/components/news/NewsHeader";
import { NewsFeed } from "@/components/news/NewsFeed";
import { NewsPreferencesModal } from "@/components/news/NewsPreferencesModal";
import { getNewsArticles, refreshNews, NewsArticle } from "@/lib/api/news";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";

const Mercado = () => {
  // Trigger guided tips for mercado screen
  useScreenTips("mercado", 600);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const ITEMS_PER_PAGE = 20;

  // Load articles from database
  const loadArticles = useCallback(
    async (reset = false, overrideCategory?: string | null) => {
      if (isLoading) return;
      
      setIsLoading(true);
      const currentOffset = reset ? 0 : page * ITEMS_PER_PAGE;
      // Use override category if provided, otherwise use state
      const categoryToUse = overrideCategory !== undefined ? overrideCategory : selectedCategory;

      try {
        const result = await getNewsArticles({
          category: categoryToUse,
          search: searchQuery || undefined,
          limit: ITEMS_PER_PAGE,
          offset: currentOffset,
        });

        if (reset) {
          setArticles(result.articles);
          setPage(1);
        } else {
          setArticles((prev) => [...prev, ...result.articles]);
          setPage((p) => p + 1);
        }
        setHasMore(result.hasMore);
      } catch (error) {
        console.error("Error loading news:", error);
        toast({
          title: t.errors.generic,
          description: t.errors.tryAgain,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, selectedCategory, page, isLoading, toast, t]
  );

  // Initial load and trigger refresh in background
  useEffect(() => {
    loadArticles(true);
    
    // Trigger background refresh
    refreshNews().catch((err) => {
      console.log("Background refresh failed:", err);
    });
  }, []);

  // Handle search change with debounce
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(0);
      setArticles([]);
      setHasMore(true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle category filter change
  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setPage(0);
    setArticles([]);
    setHasMore(true);
    // Pass category directly to avoid stale closure
    loadArticles(true, category);
  }, [loadArticles]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshNews(selectedCategory || undefined);
      await loadArticles(true);
      toast({
        title: t.common.success,
        description: t.news?.latestNews || "Notícias atualizadas!",
      });
    } catch (error) {
      console.error("Error refreshing news:", error);
      toast({
        title: t.errors.generic,
        description: t.errors.tryAgain,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCategory, loadArticles, toast, t]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadArticles(false);
    }
  }, [isLoading, hasMore, loadArticles]);

  return (
    <div className="min-h-screen">
      <NewsHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        onSettingsClick={() => setShowPreferences(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <NewsFeed
        articles={articles}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />
      <NewsPreferencesModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
      />
    </div>
  );
};

export default Mercado;
