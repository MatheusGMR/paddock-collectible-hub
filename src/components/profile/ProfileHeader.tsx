import { Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileHeaderProps {
  user: {
    username: string;
    avatar: string;
    bio: string;
    city?: string | null;
    phone?: string | null;
    followers: number;
    following: number;
    collection: number;
  };
  onEditProfile?: () => void;
  onSettings?: () => void;
}

export const ProfileHeader = ({ user, onEditProfile, onSettings }: ProfileHeaderProps) => {
  const { t } = useLanguage();
  
  return (
    <div className="border-b border-border">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">{user.username}</h1>
        <button 
          onClick={onSettings}
          className="p-2 text-foreground-secondary hover:text-primary transition-colors"
          title="Configurações"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-20 w-20 ring-2 ring-primary/30">
            <AvatarImage src={user.avatar} alt={user.username} />
            <AvatarFallback className="bg-muted text-2xl font-semibold">
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Stats */}
          <div className="flex flex-1 justify-around pt-2">
            <StatItem value={user.collection} label={t.profile.items} />
            <StatItem value={user.followers} label={t.profile.followers} />
            <StatItem value={user.following} label={t.profile.following} />
          </div>
        </div>

        {/* Bio & Location */}
        <div className="mt-4 space-y-1">
          <p className="text-sm text-foreground/90 leading-relaxed">
            {user.bio}
          </p>
          {user.city && (
            <p className="text-xs text-muted-foreground">📍 {user.city}</p>
          )}
        </div>

        {/* Edit Profile Button */}
        <Button 
          variant="outline" 
          onClick={onEditProfile}
          className="w-full mt-4 border-border text-foreground hover:bg-muted"
        >
          {t.profile.editProfile}
        </Button>
      </div>
    </div>
  );
};

const StatItem = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <p className="text-lg font-semibold">{value.toLocaleString()}</p>
    <p className="text-xs text-foreground-secondary">{label}</p>
  </div>
);
