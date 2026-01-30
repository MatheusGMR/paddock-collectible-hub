import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProfileData {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
}

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  userId: string;
  onSave: (updates: Partial<ProfileData>) => Promise<void>;
}

export const EditProfileSheet = ({ 
  open, 
  onOpenChange, 
  profile, 
  userId,
  onSave 
}: EditProfileSheetProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProfileData>({
    username: profile.username,
    bio: profile.bio || "",
    avatar_url: profile.avatar_url,
    city: profile.city || "",
    phone: profile.phone || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t.common.error,
        description: t.profile.invalidImageType,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.common.error,
        description: t.profile.imageTooLarge,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast({
        title: t.common.success,
        description: t.profile.photoUploaded,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: t.common.error,
        description: t.profile.uploadError,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      toast({
        title: t.common.error,
        description: t.errors.usernameRequired,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        username: formData.username.trim(),
        bio: formData.bio?.trim() || null,
        avatar_url: formData.avatar_url,
        city: formData.city?.trim() || null,
        phone: formData.phone?.trim() || null,
      });
      onOpenChange(false);
      toast({
        title: t.common.success,
        description: t.profile.profileUpdated,
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t.common.error,
        description: t.profile.updateError,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="mb-6">
          <SheetTitle>{t.profile.editProfile}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] pb-4">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-2 ring-primary/30">
                <AvatarImage src={formData.avatar_url || undefined} alt={formData.username} />
                <AvatarFallback className="bg-muted text-3xl font-semibold">
                  {formData.username[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">{t.profile.changePhoto}</p>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">{t.auth.username}</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder={t.auth.username}
              maxLength={30}
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">{t.profile.bio}</Label>
            <Textarea
              id="bio"
              value={formData.bio || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder={t.profile.bioPlaceholder}
              maxLength={150}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {(formData.bio?.length || 0)}/150
            </p>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">{t.profile.city}</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder={t.profile.cityPlaceholder}
              maxLength={50}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">{t.profile.phone}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t.profile.phonePlaceholder}
              maxLength={20}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t.common.save
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
