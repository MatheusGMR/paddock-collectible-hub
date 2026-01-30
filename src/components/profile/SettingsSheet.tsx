import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Settings, 
  Globe, 
  Bell, 
  User, 
  LogOut, 
  CreditCard, 
  ChevronRight,
  Check,
  Smartphone,
  Shield
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { 
  isPushSupported, 
  getPushPermission, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribedToPush 
} from "@/lib/pushNotifications";
import { supabase } from "@/integrations/supabase/client";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}

export const SettingsSheet = ({ open, onOpenChange, onSignOut }: SettingsSheetProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { status, daysLeft } = useSubscription();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported] = useState(isPushSupported());

  // Check push subscription status on mount
  useEffect(() => {
    const checkPushStatus = async () => {
      if (pushSupported) {
        const subscribed = await isSubscribedToPush();
        setPushEnabled(subscribed);
      }
    };
    
    if (open) {
      checkPushStatus();
    }
  }, [open, pushSupported]);

  const handlePushToggle = async (enabled: boolean) => {
    if (!user) return;
    
    setPushLoading(true);
    
    try {
      if (enabled) {
        const success = await subscribeToPush(user.id);
        setPushEnabled(success);
      } else {
        const success = await unsubscribeFromPush();
        if (success) setPushEnabled(false);
      }
    } catch (error) {
      console.error("Push notification toggle error:", error);
    } finally {
      setPushLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: { action: "portal" },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Error opening subscription portal:", error);
    }
  };

  const getSubscriptionStatus = () => {
    if (status === "active") {
      return { label: "Premium", color: "text-primary" };
    }
    if (status === "trial" && daysLeft > 0) {
      return { label: `Trial (${daysLeft}d)`, color: "text-amber-500" };
    }
    if (status === "expired" || status === "canceled") {
      return { label: "Expirado", color: "text-destructive" };
    }
    return { label: "Gratuito", color: "text-muted-foreground" };
  };

  const subscriptionStatus = getSubscriptionStatus();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-l border-border p-0 overflow-y-auto">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5" />
            Configurações
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Language Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Idioma
              </h3>
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🇧🇷</span>
                  <span className="text-foreground font-medium">Português (Brasil)</span>
                </div>
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-2 px-1">
              O app está configurado apenas em Português
            </p>
          </motion.section>

          <Separator className="bg-border" />

          {/* Notifications Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Notificações
              </h3>
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">Notificações Push</p>
                    <p className="text-xs text-muted-foreground">
                      Alertas de lançamentos e novidades
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={pushEnabled}
                  onCheckedChange={handlePushToggle}
                  disabled={!pushSupported || pushLoading}
                />
              </div>
              
              {!pushSupported && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-amber-500">
                    Push não suportado neste navegador
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          <Separator className="bg-border" />

          {/* Account Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Conta
              </h3>
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
              {/* Email */}
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-foreground font-medium">Email</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {user?.email || "—"}
                  </p>
                </div>
              </div>
              
              {/* Subscription */}
              <button 
                onClick={handleManageSubscription}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-foreground font-medium">Assinatura</p>
                    <p className={`text-xs ${subscriptionStatus.color}`}>
                      {subscriptionStatus.label}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>

              {/* Admin Panel - Only for admins */}
              {isAdmin && (
                <button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/admin");
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-foreground font-medium">Painel Admin</p>
                      <p className="text-xs text-muted-foreground">
                        Métricas e gerenciamento
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              
              {/* Sign Out */}
              <button 
                onClick={onSignOut}
                className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <LogOut className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-destructive font-medium">Sair da conta</p>
                </div>
                <ChevronRight className="h-5 w-5 text-destructive/50 group-hover:text-destructive transition-colors" />
              </button>
            </div>
          </motion.section>

          {/* App Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center pt-4 pb-8"
          >
            <p className="text-xs text-muted-foreground">
              Paddock v1.0.0
            </p>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
