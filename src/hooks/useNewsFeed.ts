import { useQuery } from "@tanstack/react-query";
import { getNewsArticles, NewsArticle } from "@/lib/api/news";

export const useNewsFeed = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-news"],
    queryFn: async () => {
      const result = await getNewsArticles({ limit: 15 });
      return result.articles;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  return {
    articles: data || [],
    loading: isLoading,
  };
};
