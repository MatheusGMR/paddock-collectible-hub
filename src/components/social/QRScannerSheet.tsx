import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface QRScannerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QRScannerSheet = ({ open, onOpenChange }: QRScannerSheetProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      // Stop scanner when sheet closes
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
      setIsScanning(false);
      return;
    }

    // Start scanner when sheet opens
    const startScanner = async () => {
      if (!containerRef.current) return;

      try {
        setIsScanning(true);
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Check if it's a valid profile URL
            const urlPattern = /\/user\/([a-f0-9-]+)/i;
            const match = decodedText.match(urlPattern);

            if (match) {
              const userId = match[1];
              scanner.stop().catch(console.error);
              onOpenChange(false);
              navigate(`/user/${userId}`);
            } else {
              toast({
                title: t.social.invalidQR,
                description: t.social.invalidQRDesc,
                variant: "destructive",
              });
            }
          },
          () => {
            // QR scan error - ignore (happens continuously while scanning)
          }
        );
      } catch (error) {
        console.error("Scanner start error:", error);
        setIsScanning(false);
        toast({
          title: t.common.error,
          description: t.scanner.cameraError,
          variant: "destructive",
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 100);
    return () => clearTimeout(timer);
  }, [open, navigate, onOpenChange, t, toast]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{t.social.scanQRCode}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center space-y-4">
          <div
            id="qr-reader"
            ref={containerRef}
            className="w-full max-w-sm rounded-xl overflow-hidden bg-black aspect-square"
          />
          
          {!isScanning && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.social.startingCamera}</span>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground max-w-xs">
            {t.social.pointToQR}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
