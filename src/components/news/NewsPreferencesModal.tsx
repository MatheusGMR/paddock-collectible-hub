import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserNewsPreferences,
  saveUserNewsPreferences,
  NewsPreferences,
} from "@/lib/api/news";
import { useToast } from "@/hooks/use-toast";
import { PushNotificationToggle } from "./PushNotificationToggle";

interface NewsPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { code: "collectibles", icon: "🎮" },
  { code: "motorsport", icon: "🏎️" },
  { code: "aeromodeling", icon: "✈️" },
  { code: "cars", icon: "🚗" },
  { code: "planes", icon: "🛩️" },
];

const SUBCATEGORIES: Record<string, string[]> = {
  collectibles: ["hot_wheels", "tomica", "matchbox", "diecast"],
  motorsport: ["f1", "nascar", "rally", "lemans"],
  aeromodeling: ["drones", "rc_planes"],
  cars: [],
  planes: [],
};

export const NewsPreferencesModal = ({
  open,
  onOpenChange,
}: NewsPreferencesModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>(["collectibles", "motorsport"]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [language, setLanguage] = useState("pt");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const prefs = await getUserNewsPreferences(user.id);
      if (prefs) {
        setCategories(prefs.categories || ["collectibles", "motorsport"]);
        setSubcategories(prefs.subcategories || []);
        setLanguage(prefs.language || "pt");
        setNotifications(prefs.notifications_enabled ?? true);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await saveUserNewsPreferences(user.id, {
        categories,
        subcategories,
        language,
        notifications_enabled: notifications,
      });
      
      toast({
        title: t.common.success,
        description: t.news?.preferences?.saved || "Preferências salvas!",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: t.common.error,
        description: t.errors.generic,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (code: string) => {
    setCategories((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const toggleSubcategory = (code: string) => {
    setSubcategories((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  const getCategoryLabel = (code: string) => {
    return t.news?.categories?.[code as keyof typeof t.news.categories] || code;
  };

  const getSubcategoryLabel = (code: string) => {
    return t.news?.subcategories?.[code as keyof typeof t.news.subcategories] || code;
  };

  const allSubcategories = categories.flatMap((cat) => SUBCATEGORIES[cat] || []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t.news?.preferences?.title || "Configurar Feed"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-foreground-secondary">
            {t.common.loading}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Categories */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t.news?.preferences?.interests || "Seus Interesses"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat.code}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategory(cat.code)}
                    className={`h-auto py-3 flex-col gap-1 ${
                      categories.includes(cat.code)
                        ? "bg-primary/10 border-primary text-primary"
                        : ""
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs">{getCategoryLabel(cat.code)}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Subcategories */}
            {allSubcategories.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  {t.news?.preferences?.subcategories || "Subcategorias"}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {allSubcategories.map((sub) => (
                    <label
                      key={sub}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={subcategories.includes(sub)}
                        onCheckedChange={() => toggleSubcategory(sub)}
                      />
                      <span className="text-sm">{getSubcategoryLabel(sub)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Language */}
            <div>
              <Label className="text-sm font-medium mb-3 block">
                {t.news?.preferences?.language || "Idioma"}
              </Label>
              <RadioGroup
                value={language}
                onValueChange={setLanguage}
                className="flex gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="pt" />
                  <span className="text-sm">
                    {t.news?.preferences?.portuguese || "Português"}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="en" />
                  <span className="text-sm">
                    {t.news?.preferences?.english || "Inglês"}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="all" />
                  <span className="text-sm">
                    {t.news?.preferences?.both || "Ambos"}
                  </span>
                </label>
              </RadioGroup>
            </div>

            {/* Push Notifications */}
            <Separator />
            <PushNotificationToggle />
            <Separator />

            {/* Legacy Notifications (in-app) */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t.news?.preferences?.notifications || "Notificações de Novidades"}
              </Label>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving || categories.length === 0}
              className="w-full"
            >
              {saving
                ? t.common.loading
                : t.news?.preferences?.save || "Salvar Preferências"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
