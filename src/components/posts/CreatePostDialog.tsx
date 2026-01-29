import { useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPost, uploadPostImage, uploadPostVideo } from "@/lib/api/posts";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageBase64?: string;
  videoUrl?: string;
  videoBlob?: Blob;
  collectionItemId?: string;
  itemTitle?: string;
  onSuccess?: () => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
  imageBase64,
  videoUrl,
  videoBlob,
  collectionItemId,
  itemTitle,
  onSuccess,
}: CreatePostDialogProps) {
  const [caption, setCaption] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isVideo = !!videoUrl && !!videoBlob;

  const handlePublish = async () => {
    if (!user) {
      toast({
        title: t.scanner.signInRequired,
        description: t.scanner.signInRequiredDesc,
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);

    try {
      let mediaUrl: string;

      if (isVideo && videoBlob) {
        // Upload video
        const uploadResult = await uploadPostVideo(user.id, videoBlob);
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || "Failed to upload video");
        }
        mediaUrl = uploadResult.url;
      } else if (imageBase64) {
        // Upload image
        const uploadResult = await uploadPostImage(user.id, imageBase64);
        
        if (!uploadResult.success || !uploadResult.url) {
          throw new Error(uploadResult.error || "Failed to upload image");
        }
        mediaUrl = uploadResult.url;
      } else {
        throw new Error("No media to upload");
      }

      // Create the post
      const postResult = await createPost({
        userId: user.id,
        imageUrl: mediaUrl,
        caption: caption.trim() || undefined,
        collectionItemId,
      });

      if (!postResult.success) {
        throw new Error(postResult.error || "Failed to create post");
      }

      toast({
        title: t.posts.postSuccess,
        description: t.posts.postSuccessDesc,
      });

      onOpenChange(false);
      setCaption("");
      onSuccess?.();
    } catch (error) {
      console.error("Publish error:", error);
      toast({
        title: t.posts.postError,
        description: t.posts.postErrorDesc,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.posts.createPost}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Preview */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
            {isVideo && videoUrl ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : imageBase64 ? (
              <img
                src={imageBase64}
                alt={itemTitle || "Post image"}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* Caption Input */}
          <Textarea
            placeholder={t.posts.writeCaption}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />

          {/* Character count */}
          <p className="text-xs text-foreground-secondary text-right">
            {caption.length}/500
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isPublishing}
            >
              <X className="h-4 w-4 mr-2" />
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isPublishing ? t.posts.publishing : t.posts.publish}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
