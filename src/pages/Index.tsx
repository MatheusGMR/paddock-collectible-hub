import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { useFeedPosts } from "@/hooks/useFeedPosts";
import { useScreenTips } from "@/hooks/useScreenTips";
import { Loader2, Inbox } from "lucide-react";
import { mockPosts } from "@/data/mockData";

const Index = () => {
  const { posts, loading, error } = useFeedPosts();
  
  // Trigger guided tips for feed screen
  useScreenTips("feed", 800);

  // Use real posts if available, otherwise show mock data
  const displayPosts = posts.length > 0 ? posts : mockPosts.map(p => ({
    ...p,
    caption: p.caption,
    historicalFact: null,
    user: { ...p.user, id: undefined },
    item: p.item ? { ...p.item, manufacturer: null } : null,
  }));

  return (
    <div className="min-h-screen">
      <FeedHeader />
      
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">
            Nenhum post ainda
          </p>
          <p className="text-sm text-muted-foreground">
            Escaneie um carrinho e compartilhe na rede!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {displayPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Index;
