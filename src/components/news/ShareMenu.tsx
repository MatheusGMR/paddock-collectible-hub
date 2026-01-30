import { useState } from "react";
import { Share2, X, MessageCircle, Twitter, Facebook, Link2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShareMenuProps {
  url: string;
  title: string;
  summary?: string;
}

export const ShareMenu = ({ url, title, summary }: ShareMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const shareText = summary ? `${title}\n\n${summary}` : title;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);
  const encodedTitle = encodeURIComponent(title);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      url: `https://wa.me/?text=${encodedText}%0A%0A${encodedUrl}`,
    },
    {
      name: "X (Twitter)",
      icon: Twitter,
      color: "bg-black hover:bg-zinc-800",
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
  ];

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Try native share first
    if (navigator.share) {
      navigator.share({
        title,
        text: summary || title,
        url,
      }).catch(() => {
        // If native share fails or is cancelled, open drawer
        setIsOpen(true);
      });
    } else {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (optionUrl: string) => {
    window.open(optionUrl, "_blank", "noopener,noreferrer,width=600,height=400");
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: t.news?.share?.linkCopied || "Link copiado!",
        description: t.news?.share?.linkCopiedDesc || "O link foi copiado para a área de transferência",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
      >
        <Share2 className="w-4 h-4" />
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>{t.news?.share?.title || "Compartilhar"}</DrawerTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </DrawerHeader>
          
          <div className="px-4 pb-6">
            {/* Article preview */}
            <div className="bg-muted rounded-xl p-3 mb-4">
              <p className="text-sm font-medium line-clamp-2">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{url}</p>
            </div>

            {/* Share buttons */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => handleOptionClick(option.url)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className={`p-3 rounded-full ${option.color} text-white`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-center">{option.name}</span>
                </button>
              ))}
              
              {/* Copy link button */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <div className={`p-3 rounded-full ${copied ? "bg-green-500" : "bg-muted-foreground"} text-white transition-colors`}>
                  {copied ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                </div>
                <span className="text-xs text-center">
                  {copied ? (t.news?.share?.copied || "Copiado!") : (t.news?.share?.copyLink || "Copiar")}
                </span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};
