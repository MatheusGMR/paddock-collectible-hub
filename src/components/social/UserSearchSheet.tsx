import { useState, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, QrCode, Loader2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchProfiles, Profile } from "@/lib/database";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect } from "react";

interface UserSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanQR: () => void;
}

export const UserSearchSheet = ({ open, onOpenChange, onScanQR }: UserSearchSheetProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const debouncedQuery = useDebounce(query, 300);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const profiles = await searchProfiles(searchQuery);
      setResults(profiles);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  const handleSelectUser = (profile: Profile) => {
    onOpenChange(false);
    navigate(`/user/${profile.user_id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{t.social.searchUsers}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.social.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* QR Code Option */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => {
              onOpenChange(false);
              onScanQR();
            }}
          >
            <QrCode className="h-5 w-5 text-primary" />
            <span>{t.social.scanQRToConnect}</span>
          </Button>

          {/* Results */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t.social.noUsersFound}
              </div>
            )}

            {!loading && results.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSelectUser(profile)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || ""} alt={profile.username} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{profile.username}</p>
                  {profile.city && (
                    <p className="text-sm text-muted-foreground truncate">📍 {profile.city}</p>
                  )}
                </div>
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
