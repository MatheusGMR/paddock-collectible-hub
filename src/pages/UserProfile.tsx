import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, UserPlus, UserMinus, Camera, Loader2, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PostGrid } from "@/components/profile/PostGrid";
import { CollectionList } from "@/components/profile/CollectionList";
import { IndexRanking } from "@/components/index/IndexRanking";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getProfile,
  getPublicCollection,
  getFollowCounts,
  getCollectionCount,
  isFollowing,
  followUser,
  unfollowUser,
  Profile,
  CollectionItemWithIndex,
} from "@/lib/database";
import { useToast } from "@/hooks/use-toast";
import { CollectionScannerSheet } from "@/components/social/CollectionScannerSheet";
import { MessagesSheet } from "@/components/messages/MessagesSheet";
import { getOrCreateConversation } from "@/lib/api/messages";
import { trackInteraction } from "@/lib/analytics";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<"posts" | "collection" | "index">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItemWithIndex[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, collection: 0 });
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isOwnProfile = user?.id === userId;

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    try {
      const [profileData, collectionData, followCounts, collectionCount] = await Promise.all([
        getProfile(userId),
        getPublicCollection(userId),
        getFollowCounts(userId),
        getCollectionCount(userId),
      ]);

      if (!profileData) {
        toast({
          title: t.social?.userNotFound || "Usuário não encontrado",
          variant: "destructive",
        });
        navigate(-1);
        return;
      }

      setProfile(profileData);
      setCollection(collectionData);
      setStats({
        followers: followCounts.followers,
        following: followCounts.following,
        collection: collectionCount,
      });

      // Check if current user is following this profile
      if (user && user.id !== userId) {
        const isFollowingUser = await isFollowing(user.id, userId);
        setFollowing(isFollowingUser);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: t.common?.error || "Erro",
        description: t.social?.errorLoadingProfile || "Erro ao carregar perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, user, navigate, t, toast]);

  useEffect(() => {
    if (isOwnProfile) {
      navigate("/profile", { replace: true });
      return;
    }
    loadProfile();
  }, [userId, isOwnProfile, navigate, loadProfile]);

  const handleFollowToggle = async () => {
    if (!user || !userId) return;

    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(user.id, userId);
        setFollowing(false);
        setStats((prev) => ({ ...prev, followers: prev.followers - 1 }));
        toast({ title: t.social?.unfollowed || "Deixou de seguir" });
        trackInteraction("unfollow_user", `user_${userId}`, { target_user_id: userId });
      } else {
        await followUser(user.id, userId);
        setFollowing(true);
        setStats((prev) => ({ ...prev, followers: prev.followers + 1 }));
        toast({ title: t.social?.following || "Seguindo!" });
        trackInteraction("follow_user", `user_${userId}`, { target_user_id: userId });
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast({
        title: t.common?.error || "Erro",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleOpenMessages = async () => {
    if (!userId) return;
    
    setLoadingMessage(true);
    try {
      const convId = await getOrCreateConversation(userId);
      setConversationId(convId);
      setMessagesOpen(true);
      trackInteraction("open_chat", `user_${userId}`, { target_user_id: userId });
    } catch (error) {
      console.error("Error opening messages:", error);
      toast({
        title: "Erro ao abrir mensagens",
        variant: "destructive",
      });
    } finally {
      setLoadingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const gridPosts = collection.map((item) => ({
    id: item.id,
    image: item.image_url || "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&h=300&fit=crop",
  }));

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">{profile.username}</h1>
          <div className="w-9" />
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 ring-2 ring-primary/30">
              <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
              <AvatarFallback className="bg-muted text-2xl font-semibold">
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-1 justify-around pt-2">
              <StatItem value={stats.collection} label={t.profile?.items || "Itens"} />
              <StatItem value={stats.followers} label={t.profile?.followers || "Seguidores"} />
              <StatItem value={stats.following} label={t.profile?.following || "Seguindo"} />
            </div>
          </div>

          {/* Bio & Location */}
          <div className="mt-4 space-y-1">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {profile.bio || t.profile?.defaultBio || "Colecionador de miniaturas"}
            </p>
            {profile.city && <p className="text-xs text-muted-foreground">📍 {profile.city}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={following ? "outline" : "default"}
              onClick={handleFollowToggle}
              disabled={followLoading}
              className="flex-1 gap-2"
            >
              {followLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : following ? (
                <>
                  <UserMinus className="h-4 w-4" />
                  {t.social?.unfollow || "Deixar de seguir"}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t.social?.follow || "Seguir"}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenMessages}
              disabled={loadingMessage}
              size="icon"
            >
              {loadingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setScannerOpen(true)}
              size="icon"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "posts" ? (
        gridPosts.length > 0 ? (
          <PostGrid posts={gridPosts} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>{t.profile?.noPostsYet || "Nenhuma postagem ainda"}</p>
          </div>
        )
      ) : activeTab === "collection" ? (
        collection.length > 0 ? (
          <CollectionList 
            items={collection} 
            onItemDeleted={isOwnProfile ? loadProfile : undefined}
          />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>{t.profile?.emptyCollection || "Coleção vazia"}</p>
          </div>
        )
      ) : (
        <IndexRanking items={collection} loading={false} />
      )}

      {/* Collection Scanner Sheet */}
      <CollectionScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        targetUserId={userId!}
        targetUsername={profile.username}
      />

      {/* Messages Sheet */}
      <MessagesSheet
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
        initialConversationId={conversationId}
        initialOtherUser={profile ? {
          user_id: userId!,
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : null}
      />
    </div>
  );
};

const StatItem = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    <p className="text-xs text-foreground-secondary">{label}</p>
  </div>
);

export default UserProfilePage;
