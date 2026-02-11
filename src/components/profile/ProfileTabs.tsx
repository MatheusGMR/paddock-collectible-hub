import { Grid3X3, List, TrendingUp, Settings } from "lucide-react";

interface ProfileTabsProps {
  activeTab: "posts" | "collection" | "index" | "settings";
  onTabChange: (tab: "posts" | "collection" | "index" | "settings") => void;
}

export const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  return (
    <div className="flex border-b border-border" data-tip="profile-tabs">
      <TabButton 
        icon={Grid3X3}
        isActive={activeTab === "posts"}
        onClick={() => onTabChange("posts")}
      />
      <TabButton 
        icon={List}
        isActive={activeTab === "collection"}
        onClick={() => onTabChange("collection")}
      />
      <TabButton 
        icon={TrendingUp}
        isActive={activeTab === "index"}
        onClick={() => onTabChange("index")}
      />
      <TabButton 
        icon={Settings}
        isActive={activeTab === "settings"}
        onClick={() => onTabChange("settings")}
      />
    </div>
  );
};

interface TabButtonProps {
  icon: React.ElementType;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = ({ icon: Icon, isActive, onClick }: TabButtonProps) => (
  <button 
    className={`flex-1 flex items-center justify-center py-3 relative transition-colors ${
      isActive ? "text-foreground" : "text-foreground-secondary"
    }`}
    onClick={onClick}
  >
    <Icon className="h-6 w-6" />
    {isActive && (
      <div className="tab-indicator" />
    )}
  </button>
);
