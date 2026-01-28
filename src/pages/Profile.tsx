import { useState } from "react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { PostGrid } from "@/components/profile/PostGrid";
import { CollectionList } from "@/components/profile/CollectionList";
import { mockUser, mockUserPosts, mockCollectionItems } from "@/data/mockData";

const Profile = () => {
  const [activeTab, setActiveTab] = useState<"posts" | "collection">("posts");

  return (
    <div className="min-h-screen">
      <ProfileHeader user={mockUser} />
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "posts" ? (
        <PostGrid posts={mockUserPosts} />
      ) : (
        <CollectionList items={mockCollectionItems} />
      )}
    </div>
  );
};

export default Profile;
