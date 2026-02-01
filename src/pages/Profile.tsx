import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PostGrid } from "@/components/profile/PostGrid";
import { CollectionList } from "@/components/profile/CollectionList";
import { IndexRanking } from "@/components/index/IndexRanking";
import { EditProfileSheet, ProfileData } from "@/components/profile/EditProfileSheet";
import { PhotoUploadSheet } from "@/components/profile/PhotoUploadSheet";
import { SettingsSheet } from "@/components/profile/SettingsSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";
import { getProfile, getCollectionWithIndex, getFollowCounts, getCollectionCount, updateProfile, Profile, CollectionItemWithIndex } from "@/lib/database";
import { Loader2, ImagePlus } from "lucide-react";

const ProfilePage = () => {
  // Trigger guided tips for profile screen
  useScreenTips("profile", 600);
  const [activeTab, setActiveTab] = useState<"posts" | "collection" | "index">("posts");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collection, setCollection] = useState<CollectionItemWithIndex[]>([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, collection: 0 });
  const [loading, setLoading] = useState(true);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
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

      {/* Floating Upload Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.3 
        }}
        onClick={() => setUploadSheetOpen(true)}
        data-tip="upload-button"
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-full font-medium text-sm active:scale-95 hover:bg-primary/90"
        style={{ boxShadow: '0 4px 20px rgba(76, 195, 255, 0.3)' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ImagePlus className="h-5 w-5" />
        <span>{t.profile.uploadPhotos}</span>
      </motion.button>

      {activeTab === "posts" ? (
        gridPosts.length > 0 ? (
          <PostGrid posts={gridPosts} />
        ) : (
          <div className="p-8 text-center text-foreground-secondary">
            <p>{t.profile.noPostsYet}</p>
            <p className="text-sm mt-1">{t.profile.scanItemsToAdd}</p>
          </div>
        )
      ) : activeTab === "collection" ? (
        collection.length > 0 ? (
          <CollectionList items={collection} />
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

      {/* Photo Upload Sheet */}
      <PhotoUploadSheet
        open={uploadSheetOpen}
        onOpenChange={setUploadSheetOpen}
        onCollectionUpdated={loadProfile}
      />

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
