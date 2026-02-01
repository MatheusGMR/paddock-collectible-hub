import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { mockPosts } from "@/data/mockData";
import { useScreenTips } from "@/hooks/useScreenTips";

const Index = () => {
  // Trigger guided tips for feed screen
  useScreenTips("feed", 800);

  return (
    <div className="min-h-screen">
      <FeedHeader />
      <div className="divide-y divide-border">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
};

export default Index;
