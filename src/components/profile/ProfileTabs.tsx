import { useState } from "react";
import { Grid3X3, List } from "lucide-react";

interface ProfileTabsProps {
  activeTab: "posts" | "collection";
  onTabChange: (tab: "posts" | "collection") => void;
}

export const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  return (
    <div className="flex border-b border-border">
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
