import { useState } from "react";
import { Settings, Search, QrCode, UserPen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserSearchSheet } from "@/components/social/UserSearchSheet";
import { QRCodeSheet } from "@/components/social/QRCodeSheet";
import { QRScannerSheet } from "@/components/social/QRScannerSheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import paddockWordmark from "@/assets/paddock-wordmark-new.png";
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
    averageIndex?: number | null;
  };
  onEditProfile?: () => void;
  onSettings?: () => void;
}

export const ProfileHeader = ({ user, onEditProfile, onSettings }: ProfileHeaderProps) => {
  const { t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  
  return (
    <>
      {/* Top Bar with Paddock Logo - sticky with safe-area */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img 
              src={paddockWordmark} 
              alt="Paddock" 
              style={{ height: 30, width: "auto" }}
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg bg-blue-subtle text-foreground-secondary hover:text-primary hover:bg-primary/20 transition-colors"
              title={t.social.searchUsers}
            >
              <Search className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setQrCodeOpen(true)}
              className="p-2 rounded-lg bg-blue-subtle text-foreground-secondary hover:text-primary hover:bg-primary/20 transition-colors"
              title={t.social.myQRCode}
            >
              <QrCode className="h-5 w-5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 rounded-lg bg-blue-subtle text-foreground-secondary hover:text-primary hover:bg-primary/20 transition-colors"
                  title="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onEditProfile} className="gap-2">
                  <UserPen className="h-4 w-4" />
                  {t.profile.editProfile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSettings} className="gap-2">
                  <Settings className="h-4 w-4" />
                  {t.profile.settings || "Configurações"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="border-b border-border bg-background">

        {/* Profile Info */}
        <div className="px-4 pb-6 pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar with username below */}
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                <AvatarImage src={user.avatar} alt={user.username} />
                <AvatarFallback className="bg-muted text-2xl font-semibold">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {user.username}
              </p>
            </div>

            {/* Stats */}
            <div className="flex flex-1 justify-around pt-2">
              <StatItem value={user.collection} label={t.profile.items} />
              <StatItem 
                value={user.averageIndex ?? 0} 
                label={t.profile.rarity} 
                highlight={user.averageIndex != null}
              />
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

        </div>
      </div>

      {/* Search Sheet */}
      <UserSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onScanQR={() => {
          setSearchOpen(false);
          setQrScannerOpen(true);
        }}
      />

      {/* QR Code Sheet */}
      <QRCodeSheet
        open={qrCodeOpen}
        onOpenChange={setQrCodeOpen}
      />

      {/* QR Scanner Sheet */}
      <QRScannerSheet
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
      />
    </>
  );
};

const StatItem = ({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) => (
  <div className="text-center">
    <p className={cn("text-lg font-semibold", highlight && "text-primary")}>
      {value.toLocaleString()}
    </p>
    <p className="text-xs text-foreground-secondary">{label}</p>
  </div>
);
