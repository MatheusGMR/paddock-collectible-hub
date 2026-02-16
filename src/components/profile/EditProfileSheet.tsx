import { useState, useRef, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Check, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { AvatarCropSheet } from "./AvatarCropSheet";
import { SettingsSection } from "./SettingsSection";

export interface ProfileData {
  username: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  phone: string | null;
  show_collection_value?: boolean;
}

interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData;
  userId: string;
  onSave: (updates: Partial<ProfileData>) => Promise<void>;
  onSignOut: () => void;
}

export const EditProfileSheet = ({ 
  open, 
  onOpenChange, 
  profile, 
  userId,
  onSave,
  onSignOut,
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
    show_collection_value: profile.show_collection_value ?? true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<ProfileData | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  
  // Track if user is actively typing (to prevent save during typing)
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Username validation state
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameValid, setUsernameValid] = useState(false);
  
  // Crop sheet state
  const [showCropSheet, setShowCropSheet] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Debounce form data for auto-save - increased to 3.5 seconds for better typing experience
  const debouncedFormData = useDebounce(formData, 3500);
  
  // Debounce username for validation
  const debouncedUsername = useDebounce(formData.username, 500);
  
  // Handle typing state - prevents save while user is actively typing
  const handleFieldChange = useCallback((field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout - mark typing as done after 3.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3500);
  }, []);
  
  // Save on blur (when user clicks outside the field)
  const handleFieldBlur = useCallback(() => {
    // Clear typing state immediately on blur
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Reset form data when profile changes
  useEffect(() => {
    setFormData({
      username: profile.username,
      bio: profile.bio || "",
      avatar_url: profile.avatar_url,
      city: profile.city || "",
      phone: profile.phone || "",
      show_collection_value: profile.show_collection_value ?? true,
    });
    setLastSaved(null);
    setUsernameError(null);
    setUsernameValid(false);
  }, [profile]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      const username = debouncedUsername.trim().toLowerCase();
      
      // Skip if empty
      if (!username) {
        setUsernameError(t.profile.usernameRequired);
        setUsernameValid(false);
        return;
      }
      
      // Skip if same as current username
      if (username === profile.username.toLowerCase()) {
        setUsernameError(null);
        setUsernameValid(true);
        return;
      }
      
      setIsCheckingUsername(true);
      setUsernameError(null);
      setUsernameValid(false);
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .ilike("username", username)
          .neq("user_id", userId)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setUsernameError(t.profile.usernameTaken);
          setUsernameValid(false);
        } else {
          setUsernameError(null);
          setUsernameValid(true);
        }
      } catch (error) {
        console.error("Error checking username:", error);
      } finally {
        setIsCheckingUsername(false);
      }
    };
    
    if (open) {
      checkUsername();
    }
  }, [debouncedUsername, profile.username, userId, open, t.profile.usernameRequired, t.profile.usernameTaken]);

  // Auto-save when debounced data changes AND user is not actively typing
  useEffect(() => {
    const autoSave = async () => {
      // Skip if user is still typing
      if (isTyping) return;
      
      // Skip if no changes or invalid data
      if (!debouncedFormData.username.trim()) return;
      if (debouncedFormData.phone && !validatePhone(debouncedFormData.phone)) return;
      if (usernameError) return; // Don't save if username has error
      if (isCheckingUsername) return; // Wait for username check
      
      // Check if there are actual changes
      const hasChanges = 
        debouncedFormData.username !== profile.username ||
        debouncedFormData.bio !== (profile.bio || "") ||
        debouncedFormData.avatar_url !== profile.avatar_url ||
        debouncedFormData.city !== (profile.city || "") ||
        debouncedFormData.phone !== (profile.phone || "") ||
        debouncedFormData.show_collection_value !== (profile.show_collection_value ?? true);

      // Skip if same as last save
      if (lastSaved && 
          debouncedFormData.username === lastSaved.username &&
          debouncedFormData.bio === lastSaved.bio &&
          debouncedFormData.avatar_url === lastSaved.avatar_url &&
          debouncedFormData.city === lastSaved.city &&
          debouncedFormData.phone === lastSaved.phone &&
          debouncedFormData.show_collection_value === lastSaved.show_collection_value) {
        return;
      }

      if (!hasChanges) return;

      setIsSaving(true);
      try {
        await onSave({
          username: debouncedFormData.username.trim(),
          bio: debouncedFormData.bio?.trim() || null,
          avatar_url: debouncedFormData.avatar_url,
          city: debouncedFormData.city?.trim() || null,
          phone: debouncedFormData.phone?.trim() || null,
          show_collection_value: debouncedFormData.show_collection_value,
        });
        setLastSaved(debouncedFormData);
        setShowSavedIndicator(true);
        setTimeout(() => setShowSavedIndicator(false), 2000);
      } catch (error) {
        console.error("Auto-save error:", error);
      } finally {
        setIsSaving(false);
      }
    };

    if (open && !isTyping) {
      autoSave();
    }
  }, [debouncedFormData, open, onSave, profile, lastSaved, usernameError, isCheckingUsername, isTyping]);

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

    // Validate file size (max 10MB for cropping)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t.common.error,
        description: t.profile.imageTooLarge,
        variant: "destructive",
      });
      return;
    }

    // Read file as base64 and open crop sheet
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageToCrop(result);
      setShowCropSheet(true);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
  };

  const handleCropComplete = async (croppedImageBase64: string) => {
    setIsUploading(true);
    try {
      // Convert base64 to blob
      const response = await fetch(croppedImageBase64);
      const blob = await response.blob();
      
      // Path must start with userId to match storage policy: (auth.uid())::text = (storage.foldername(name))[1]
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${userId}/${fileName}`;

      // Upload to storage with upsert to handle existing files
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: true, // Allow overwriting existing files
        });

      if (uploadError) {
        console.error("Upload error details:", uploadError);
        throw uploadError;
      }

      // Get public URL with cache-busting query param
      const { data: { publicUrl } } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      // Add cache-busting to URL to ensure new image is shown
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Update form data with cache-busted URL - this will trigger auto-save
      setFormData(prev => ({ ...prev, avatar_url: urlWithCacheBust }));
      
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
      setImageToCrop(null);
    }
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true;
    const phoneRegex = /^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3,5}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl pt-safe">
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between">
              <SheetTitle>{t.profile.editProfile}</SheetTitle>
              {/* Auto-save indicator */}
              <div className="flex items-center gap-2 text-sm">
                {isSaving && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.common.saving || "Salvando..."}
                  </span>
                )}
                {showSavedIndicator && !isSaving && (
                  <span className="text-primary flex items-center gap-1 animate-in fade-in">
                    <Check className="h-3 w-3" />
                    {t.common.saved || "Salvo"}
                  </span>
                )}
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-5 overflow-y-auto max-h-[calc(90vh-80px)] pb-8">
            {/* Avatar - Always visible at top */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <Avatar className="h-20 w-20 ring-2 ring-primary/30">
                  <AvatarImage src={formData.avatar_url || undefined} alt={formData.username} />
                  <AvatarFallback className="bg-muted text-2xl font-semibold">
                    {formData.username[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
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
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{formData.username}</p>
                <button 
                  onClick={handleAvatarClick}
                  className="text-sm text-primary hover:underline"
                >
                  {t.profile.changePhoto}
                </button>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleFieldChange("username", e.target.value)}
                  onBlur={handleFieldBlur}
                  placeholder={t.auth.username}
                  maxLength={30}
                  className={usernameError ? "border-destructive pr-10" : usernameValid ? "border-primary pr-10" : "pr-10"}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingUsername && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isCheckingUsername && usernameValid && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {!isCheckingUsername && usernameError && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
              {isCheckingUsername && (
                <p className="text-xs text-muted-foreground">{t.profile.usernameChecking}</p>
              )}
              {!isCheckingUsername && usernameValid && formData.username !== profile.username && (
                <p className="text-xs text-primary">{t.profile.usernameAvailable}</p>
              )}
              {!isCheckingUsername && usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">{t.profile.bio}</Label>
              <Textarea
                id="bio"
                value={formData.bio || ""}
                onChange={(e) => handleFieldChange("bio", e.target.value)}
                onBlur={handleFieldBlur}
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
                onChange={(e) => handleFieldChange("city", e.target.value)}
                onBlur={handleFieldBlur}
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
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                onBlur={handleFieldBlur}
                placeholder={t.profile.phonePlaceholder}
                maxLength={20}
              />
              {formData.phone && !validatePhone(formData.phone) && (
                <p className="text-xs text-destructive">{t.profile.invalidPhone}</p>
              )}
            </div>

            {/* Collection Value Visibility */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {formData.show_collection_value ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label className="text-sm font-medium">Valor da coleção visível</Label>
                    <p className="text-xs text-muted-foreground">
                      Permitir que visitantes vejam o valor estimado da sua coleção
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.show_collection_value ?? true}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, show_collection_value: checked }));
                    setIsTyping(false);
                  }}
                />
              </div>
            </div>

            {/* Settings Section */}
            <div className="mt-6 border-t border-border pt-6">
              <SettingsSection onSignOut={onSignOut} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Crop Sheet */}
      {imageToCrop && (
        <AvatarCropSheet
          open={showCropSheet}
          onOpenChange={setShowCropSheet}
          imageUrl={imageToCrop}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
};
