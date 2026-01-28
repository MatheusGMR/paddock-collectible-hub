import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ItemBadge } from "./ItemBadge";

interface PostCardProps {
  post: {
    id: string;
    user: {
      username: string;
      avatar: string;
    };
    image: string;
    caption: string;
    likes: number;
    comments: number;
    item?: {
      brand: string;
      model: string;
      year: string;
      scale: string;
    };
    createdAt: string;
  };
}

export const PostCard = ({ post }: PostCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="border-b border-border animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src={post.user.avatar} alt={post.user.username} />
            <AvatarFallback className="bg-muted text-foreground">
              {post.user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{post.user.username}</span>
        </div>
        <button className="p-2 text-foreground-secondary hover:text-foreground transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative aspect-square w-full bg-muted">
        <img 
          src={post.image} 
          alt={post.caption}
          className="post-image"
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLiked(!liked)}
            className="transition-transform active:scale-90"
          >
            <Heart 
              className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : "text-foreground"}`} 
            />
          </button>
          <button className="transition-transform active:scale-90">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button className="transition-transform active:scale-90">
            <Send className="h-6 w-6" />
          </button>
        </div>
        <button 
          onClick={() => setSaved(!saved)}
          className="transition-transform active:scale-90"
        >
          <Bookmark 
            className={`h-6 w-6 ${saved ? "fill-foreground" : ""}`} 
          />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4">
        <p className="text-sm font-semibold">
          {(post.likes + (liked ? 1 : 0)).toLocaleString()} likes
        </p>
      </div>

      {/* Caption */}
      <div className="px-4 py-2">
        <p className="text-sm">
          <span className="font-semibold">{post.user.username}</span>{" "}
          <span className="text-foreground/90">{post.caption}</span>
        </p>
      </div>

      {/* Item Badge */}
      {post.item && (
        <div className="px-4 pb-3">
          <ItemBadge item={post.item} />
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
