import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QRCodeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRCodeSheet = ({ open, onOpenChange }: QRCodeSheetProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const profileUrl = user ? `${window.location.origin}/user/${user.id}` : "";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.social.shareProfile,
          text: t.social.shareProfileText,
          url: profileUrl,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: t.common.success,
        description: t.social.linkCopied,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{t.social.myQRCode}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center py-6 space-y-6">
          <div className="p-6 bg-white rounded-2xl shadow-lg">
            <QRCodeSVG
              value={profileUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin
            />
          </div>
          
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            {t.social.qrCodeDescription}
          </p>

          <Button onClick={handleShare} variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            {t.social.shareProfile}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
