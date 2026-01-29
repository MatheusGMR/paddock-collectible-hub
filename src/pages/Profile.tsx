import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PostGrid } from "@/components/profile/PostGrid";
import { CollectionList } from "@/components/profile/CollectionList";
import { IndexRanking } from "@/components/index/IndexRanking";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, getCollectionWithIndex, getFollowCounts, getCollectionCount, Profile, CollectionItemWithIndex } from "@/lib/database";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState<"posts" | "collection" | "index">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItemWithIndex[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, collection: 0 });
  const [loading, setLoading] = useState(true);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadProfile = async () => {
      try {
        const [profileData, collectionData, followCounts, collectionCount] = await Promise.all([
          getProfile(user.id),
          getCollectionWithIndex(user.id),
          getFollowCounts(user.id),
          getCollectionCount(user.id),
        ]);

        setProfile(profileData);
        setCollection(collectionData);
        setStats({
          followers: followCounts.followers,
          following: followCounts.following,
          collection: collectionCount,
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const userData = {
    username: profile?.username || "User",
    avatar: profile?.avatar_url || "",
    bio: profile?.bio || "Collector at Paddock",
    followers: stats.followers,
    following: stats.following,
    collection: stats.collection,
  };

  // Transform collection items to grid format
  const gridPosts = collection.map((item) => ({
    id: item.id,
    image: item.image_url || "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&h=300&fit=crop",
  }));

  return (
    <div className="min-h-screen">
      <ProfileHeader user={userData} />
      
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          onClick={handleSignOut}
          className="w-full border-border text-foreground-secondary hover:bg-muted text-sm"
        >
          Sign Out
        </Button>
      </div>
      
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "posts" ? (
        gridPosts.length > 0 ? (
          <PostGrid posts={gridPosts} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>No posts yet</p>
            <p className="text-sm mt-1">Scan items to add to your collection</p>
          </div>
        )
      ) : activeTab === "collection" ? (
        collection.length > 0 ? (
          <CollectionList items={collection} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>Your collection is empty</p>
            <p className="text-sm mt-1">Use the scanner to add items</p>
          </div>
        )
      ) : (
        <IndexRanking items={collection} loading={false} />
      )}
    </div>
  );
};

export default ProfilePage;
