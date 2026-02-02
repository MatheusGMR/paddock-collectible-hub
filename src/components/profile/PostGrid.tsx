import { useState } from "react";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";

interface PostGridProps {
  posts: Array<{
    id: string;
    image: string;
  }>;
  collectionItems?: CollectibleDetailItem[];
}

export const PostGrid = ({ posts, collectionItems = [] }: PostGridProps) => {
  const [selectedItem, setSelectedItem] = useState<CollectibleDetailItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handlePostClick = (postId: string) => {
    // Find the corresponding collection item
    const item = collectionItems.find(ci => ci.id === postId);
    if (item) {
      setSelectedItem(item);
      setDrawerOpen(true);
    }
  };

  return (
    <>
      <div className="profile-grid">
        {posts.map((post) => (
          <button 
            key={post.id}
            onClick={() => handlePostClick(post.id)}
            className="aspect-square bg-muted overflow-hidden hover:opacity-80 transition-opacity active:scale-95"
          >
            <img 
              src={post.image} 
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <CollectibleDetailCard
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
};
