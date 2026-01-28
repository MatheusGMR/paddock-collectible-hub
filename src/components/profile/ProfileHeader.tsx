import { Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ProfileHeaderProps {
  user: {
    username: string;
    avatar: string;
    bio: string;
    followers: number;
    following: number;
    collection: number;
  };
}

export const ProfileHeader = ({ user }: ProfileHeaderProps) => {
  return (
    <div className="border-b border-border">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold">{user.username}</h1>
        <button className="p-2 text-foreground hover:text-primary transition-colors">
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
            <StatItem value={user.collection} label="Items" />
            <StatItem value={user.followers} label="Followers" />
            <StatItem value={user.following} label="Following" />
          </div>
        </div>

        {/* Bio */}
        <div className="mt-4">
          <p className="text-sm text-foreground/90 leading-relaxed">
            {user.bio}
          </p>
        </div>

        {/* Edit Profile Button */}
        <Button 
          variant="outline" 
          className="w-full mt-4 border-border text-foreground hover:bg-muted"
        >
          Edit Profile
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
