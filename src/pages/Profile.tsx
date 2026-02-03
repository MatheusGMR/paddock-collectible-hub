import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PostGrid } from "@/components/profile/PostGrid";
import { CollectionList } from "@/components/profile/CollectionList";
import { IndexRanking } from "@/components/index/IndexRanking";
import { EditProfileSheet, ProfileData } from "@/components/profile/EditProfileSheet";
import { SettingsSheet } from "@/components/profile/SettingsSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";
import { getProfile, getCollectionWithIndex, getFollowCounts, getCollectionCount, updateProfile, Profile, CollectionItemWithIndex } from "@/lib/database";
import { Loader2 } from "lucide-react";

const ProfilePage = () => {
  // Trigger guided tips for profile screen
  useScreenTips("profile", 600);
  const [activeTab, setActiveTab] = useState<"posts" | "collection" | "index">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItemWithIndex[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, collection: 0 });
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const loadProfile = useCallback(async () => {
    if (!user) return;
    
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
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadProfile();
  }, [user, navigate, loadProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleSaveProfile = async (updates: Partial<ProfileData>) => {
    if (!user) return;
    
    await updateProfile(user.id, updates);
    
    // Refresh profile data
    const updatedProfile = await getProfile(user.id);
    setProfile(updatedProfile);
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
    username: profile?.username || t.profile.defaultUser,
    avatar: profile?.avatar_url || "",
    bio: profile?.bio || t.profile.defaultBio,
    city: profile?.city,
    phone: profile?.phone,
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
    <div className="min-h-screen pb-20">
      <ProfileHeader 
        user={userData} 
        onEditProfile={() => setEditSheetOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />


      {activeTab === "posts" ? (
        gridPosts.length > 0 ? (
          <PostGrid posts={gridPosts} collectionItems={collection} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>{t.profile.noPostsYet}</p>
            <p className="text-sm mt-1">{t.profile.scanItemsToAdd}</p>
          </div>
        )
      ) : activeTab === "collection" ? (
        collection.length > 0 ? (
          <CollectionList items={collection} onItemDeleted={loadProfile} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>{t.profile.emptyCollection}</p>
            <p className="text-sm mt-1">{t.profile.useScannerToAdd}</p>
          </div>
        )
      ) : (
        <IndexRanking items={collection} loading={false} />
      )}

      {/* Edit Profile Sheet */}
      {profile && (
        <EditProfileSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          profile={{
            username: profile.username,
            bio: profile.bio,
            avatar_url: profile.avatar_url,
            city: profile.city,
            phone: profile.phone,
          }}
          userId={user.id}
          onSave={handleSaveProfile}
        />
      )}


      {/* Settings Sheet */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSignOut={handleSignOut}
      />
    </div>
  );
};

export default ProfilePage;
