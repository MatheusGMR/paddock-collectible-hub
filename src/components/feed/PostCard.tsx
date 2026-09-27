import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ItemBadge } from "./ItemBadge";
import { trackInteraction } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { likePost, unlikePost, hasLikedPost } from "@/lib/api/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CollectibleDetailCard, CollectibleDetailItem } from "@/components/collection/CollectibleDetailCard";
import { PriceIndexBreakdown } from "@/lib/priceIndex";
import { RarityContext } from "@/lib/rarityContext";
import { toast } from "sonner";
import { LazyThumb } from "@/components/ui/lazy-thumb";
import { useQueryClient } from "@tanstack/react-query";

// Helper to validate UUID format (prevents API calls with mock post IDs like "1", "2")
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

interface PostCardProps {
  post: {
    id: string;
    collectionItemId?: string | null;
    user: {
      id?: string;
      username: string;
      avatar: string;
    };
    image: string;
    caption: string | null;
    historicalFact?: string | null;
    likes: number;
    comments: number;
    item?: {
      brand: string;
      model: string;
      year?: string | null;
      scale?: string | null;
      manufacturer?: string | null;
    } | null;
    createdAt: string;
    topComment?: {
      id: string;
      content: string;
      username: string;
      likesCount: number;
    } | null;
    isFromFollowing?: boolean;
    isCuriosity?: boolean;
    originalOwner?: {
      id: string;
      username: string;
    };
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [detailItem, setDetailItem] = useState<CollectibleDetailItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [openingDetail, setOpeningDetail] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if this is a curiosity post (not a real database post)
  const isCuriosity = post.isCuriosity || post.id.startsWith('curiosity-');
  const canInteract = !isCuriosity && isValidUUID(post.id);

  // Check if user has liked this post on mount (only for real posts with valid UUIDs)
  useEffect(() => {
    if (user && canInteract) {
      hasLikedPost(post.id).then(setLiked);
    }
  }, [user, post.id, canInteract]);

  const handleLike = async () => {
    if (isLiking || !user || !canInteract) return;
    
    setIsLiking(true);
    const newLiked = !liked;
    
    // Optimistic update
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    
    try {
      if (newLiked) {
        await likePost(post.id, post.user.id || "");
      } else {
        await unlikePost(post.id);
      }
      
      trackInteraction("like_post", `post_${post.id}`, { 
        action: newLiked ? "like" : "unlike",
        post_id: post.id 
      });
    } catch (error) {
      // Revert on error
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    trackInteraction("save_post", `post_${post.id}`, { 
      action: newSaved ? "save" : "unsave",
      post_id: post.id 
    });
  };

  const handleShare = () => {
    trackInteraction("share_post", `post_${post.id}`, { post_id: post.id });
  };

  const handleComment = () => {
    trackInteraction("open_comments", `post_${post.id}`, { post_id: post.id });
  };

  const handleUserClick = () => {
    if (post.user.id) {
      navigate(`/user/${post.user.id}`);
    }
  };

  const handleOriginalOwnerClick = () => {
    if (post.originalOwner?.id) {
      navigate(`/user/${post.originalOwner.id}`);
    }
  };

  const openCollectible = async () => {
    const collectionId = post.collectionItemId;
    if (!collectionId || openingDetail) return;
    setDetailOpen(true);
    if (detailItem?.id === collectionId) return;
    // Present the photographed car immediately while its full details load.
    setDetailItem({
      id: collectionId,
      image_url: post.image,
      item: {
        real_car_brand: post.item?.brand || "Colecionável",
        real_car_model: post.item?.model || "",
        real_car_year: post.item?.year,
        collectible_scale: post.item?.scale,
      },
    });
    setOpeningDetail(true);
    try {
      const { data, error } = await supabase.from("user_collection")
        .select("id,image_url,original_image_url,user_context,item:items(real_car_brand,real_car_model,real_car_year,historical_fact,collectible_manufacturer,collectible_scale,collectible_series,collectible_origin,collectible_condition,collectible_year,collectible_notes,price_index,rarity_tier,index_breakdown,music_suggestion,music_selection_reason,real_car_photos,estimated_value_min,estimated_value_max)")
        .eq("id", collectionId).maybeSingle();
      if (error) throw error;
      if (!data?.item) {
        toast.error("Colecionável indisponível");
        setDetailOpen(false);
        return;
      }
      setDetailItem({
        ...data,
        user_context: data.user_context as RarityContext | null,
        item: {
          ...data.item,
          index_breakdown: data.item.index_breakdown as unknown as PriceIndexBreakdown | null,
          real_car_photos: data.item.real_car_photos as string[] | null,
        },
      });
      setDetailOpen(true);
    } catch (error) {
      console.error("Error opening collectible:", error);
      toast.error("Não foi possível abrir o colecionável");
    } finally {
      setOpeningDetail(false);
    }
  };

  // Determine which text to show - prefer historical fact with owner mention, fallback to caption
  const hasHistoricalFact = post.historicalFact && post.item;
  const displayText = hasHistoricalFact
    ? post.historicalFact
    : post.caption;

  return (
    <>
    <article
      className={cn("border-b border-border animate-fade-in", post.collectionItemId && "cursor-pointer")}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, [role='button'], [data-user-link]")) return;
        void openCollectible();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          data-user-link
          onClick={handleUserClick}
        >
          <Avatar className={cn(
            "h-9 w-9 ring-2",
            post.isFromFollowing ? "ring-primary" : "ring-primary/20"
          )}>
            <AvatarImage src={post.user.avatar} alt={post.user.username} />
            <AvatarFallback className="bg-muted text-foreground">
              {post.user.username[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{post.user.username}</span>
            {post.isFromFollowing && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Seguindo
              </span>
            )}
          </div>
        </div>
        <button className="p-2 text-foreground-secondary hover:text-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] w-full bg-muted overflow-hidden">
        {post.collectionItemId && <button type="button" className="absolute inset-0 z-10 w-full" aria-label="Abrir detalhes do colecionável" onClick={() => void openCollectible()} />}
        {post.image && <LazyThumb src={post.image} alt={post.caption || "Colecionável"} className="block h-full w-full object-contain" width={800} />}
      </div>

      {/* Actions - hide for curiosity posts */}
      {!isCuriosity && (
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="transition-transform active:scale-90"
              disabled={!canInteract}
            >
              <Heart 
                className={cn(
                  "h-6 w-6",
                  liked ? "fill-destructive text-destructive" : "text-foreground"
                )} 
              />
            </button>
            <button 
              onClick={handleComment}
              className="transition-transform active:scale-90"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button 
              onClick={handleShare}
              className="transition-transform active:scale-90"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="transition-transform active:scale-90"
          >
            <Bookmark 
              className={cn("h-6 w-6", saved && "fill-foreground")} 
            />
          </button>
        </div>
      )}

      {/* Likes - hide for curiosity posts */}
      {!isCuriosity && likeCount > 0 && (
        <div className="px-4">
          <p className="text-sm font-semibold">
            {likeCount.toLocaleString()} likes
          </p>
        </div>
      )}

      {/* Caption or Historical Fact */}
      <div className="px-4 py-2">
        {isCuriosity && post.originalOwner ? (
          // Curiosity post: show historical fact + mention original owner
          <div className="space-y-2">
            {post.historicalFact && (
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {post.historicalFact}
                </p>
              </div>
            )}
            <p className="text-sm">
              <span className="font-semibold">{post.user.username}</span>{" "}
              <span className="text-foreground/90">
                Da coleção de{" "}
                <button 
                  className="font-semibold text-primary hover:underline"
                  onClick={handleOriginalOwnerClick}
                >
                  @{post.originalOwner.username}
                </button>
              </span>
            </p>
          </div>
        ) : hasHistoricalFact ? (
          <div className="space-y-2">
            {/* Historical fact with icon */}
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground/90 leading-relaxed">
                {displayText}
              </p>
            </div>
            {/* Owner credit */}
            <p className="text-xs text-muted-foreground">
              Da coleção de{" "}
              <button 
                className="font-semibold text-primary hover:underline"
                onClick={handleUserClick}
              >
                @{post.user.username}
              </button>
            </p>
          </div>
        ) : displayText ? (
          <p className="text-sm">
            <span className="font-semibold">{post.user.username}</span>{" "}
            <span className="text-foreground/90">{displayText}</span>
          </p>
        ) : null}
      </div>

      {/* Item Badge */}
      {post.item && (
        <div className="px-4 pb-3">
          <ItemBadge item={{
            brand: post.item.manufacturer || post.item.brand,
            model: `${post.item.brand} ${post.item.model}`,
            year: post.item.year || "",
            scale: post.item.scale || "1:64",
          }} />
        </div>
      )}

      {/* Top Comment */}
      {post.topComment && (
        <div className="px-4 pb-2">
          <p className="text-sm">
            <span className="font-semibold">{post.topComment.username}</span>{" "}
            <span className="text-foreground/80">{post.topComment.content}</span>
          </p>
        </div>
      )}

      {/* View all comments link */}
      {post.comments > 1 && (
        <div className="px-4 pb-2">
          <button 
            onClick={handleComment}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver todos os {post.comments} comentários
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-4 pb-4">
        <p className="text-[10px] uppercase tracking-wide text-foreground-secondary">
          {post.createdAt}
        </p>
      </div>
    </article>
    <CollectibleDetailCard
      item={detailItem}
      open={detailOpen}
      onOpenChange={setDetailOpen}
      canEditPhoto={!!user && user.id === (post.isCuriosity ? post.originalOwner?.id : post.user.id)}
      onPhotoUpdated={() => { void queryClient.invalidateQueries({ queryKey: ["feed-posts"] }); }}
    />
    </>
  );
};
