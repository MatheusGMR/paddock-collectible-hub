import { FeedHeader } from "@/components/feed/FeedHeader";
import { PostCard } from "@/components/feed/PostCard";
import { mockPosts } from "@/data/mockData";

const Index = () => {
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
