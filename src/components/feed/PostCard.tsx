import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ItemBadge } from "./ItemBadge";
import { trackInteraction } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { likePost, unlikePost, hasLikedPost } from "@/lib/api/notifications";
import { useAuth } from "@/contexts/AuthContext";

// Helper to validate UUID format (prevents API calls with mock post IDs like "1", "2")
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

interface PostCardProps {
  post: {
    id: string;
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
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Determine which text to show - prefer historical fact with owner mention, fallback to caption
  const hasHistoricalFact = post.historicalFact && post.item;
  const displayText = hasHistoricalFact
    ? post.historicalFact
    : post.caption;

  return (
    <article className="border-b border-border animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
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
      <div className="relative aspect-square w-full bg-muted">
        <img 
          src={post.image} 
          alt={post.caption || "Post"}
          className="post-image"
          loading="lazy"
        />
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
        {hasHistoricalFact ? (
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
  );
};
