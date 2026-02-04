import { useState } from "react";
import { Pin } from "lucide-react";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";
import { getRarityTier, getTierColor, getTierBorderColor } from "@/lib/priceIndex";
import { togglePinItem } from "@/lib/database";
import { cn } from "@/lib/utils";

interface PostGridProps {
  posts: Array<{
    id: string;
    image: string;
    priceIndex?: number | null;
    rarityTier?: string | null;
    isPinned?: boolean;
  }>;
  collectionItems?: CollectibleDetailItem[];
  onPinToggle?: () => void;
}

export const PostGrid = ({ posts, collectionItems = [], onPinToggle }: PostGridProps) => {
  const [selectedItem, setSelectedItem] = useState<CollectibleDetailItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinningId, setPinningId] = useState<string | null>(null);

  const handlePostClick = (postId: string) => {
    // Find the corresponding collection item
    const item = collectionItems.find(ci => ci.id === postId);
    if (item) {
      setSelectedItem(item);
      setDrawerOpen(true);
    }
  };

  const handlePinToggle = async (e: React.MouseEvent, postId: string, currentlyPinned: boolean) => {
    e.stopPropagation();
    setPinningId(postId);
    try {
      await togglePinItem(postId, !currentlyPinned);
      onPinToggle?.();
    } catch (error) {
      console.error("Error toggling pin:", error);
    } finally {
      setPinningId(null);
    }
  };

  const getIndexColor = (tier: string | null): string => {
    if (!tier) return "text-foreground-secondary";
    return getTierColor(tier);
  };

  const getBorderColor = (tier: string | null): string => {
    if (!tier) return "border-foreground-secondary";
    return getTierBorderColor(tier);
  };

  return (
    <>
      <div className="profile-grid">
        {posts.map((post) => {
          const tier = post.rarityTier || (post.priceIndex ? getRarityTier(post.priceIndex) : null);
          
          return (
            <button 
              key={post.id}
              onClick={() => handlePostClick(post.id)}
              className="aspect-square bg-muted overflow-hidden hover:opacity-90 transition-opacity active:scale-[0.98] relative group"
            >
              <img 
                src={post.image} 
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  // Fallback for broken images
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              
              {/* Index Badge - top left */}
              {post.priceIndex != null && (
                <div className="absolute top-1.5 left-1.5 flex items-center justify-center">
                  <div className={cn(
                    "w-9 h-9 rounded-full bg-black/70 border-2 flex items-center justify-center backdrop-blur-sm",
                    getBorderColor(tier)
                  )}>
                    <span className={cn("text-xs font-bold", getIndexColor(tier))}>
                      {post.priceIndex}
                    </span>
                  </div>
                </div>
              )}

              {/* Pin indicator - top right */}
              {post.isPinned && (
                <div className="absolute top-1.5 right-1.5">
                  <Pin className="h-4 w-4 text-primary fill-primary drop-shadow-md" />
                </div>
              )}

              {/* Pin button on hover/touch */}
              <button
                onClick={(e) => handlePinToggle(e, post.id, post.isPinned || false)}
                disabled={pinningId === post.id}
                className={cn(
                  "absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all",
                  "bg-black/50 backdrop-blur-sm border border-white/20",
                  "opacity-0 group-hover:opacity-100 group-active:opacity-100",
                  post.isPinned && "opacity-100 bg-primary/80",
                  pinningId === post.id && "opacity-50"
                )}
              >
                <Pin className={cn(
                  "h-3.5 w-3.5",
                  post.isPinned ? "text-primary-foreground fill-primary-foreground" : "text-white"
                )} />
              </button>
            </button>
          );
        })}
      </div>

      <CollectibleDetailCard
        item={selectedItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
};
