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
  Shield,
  HelpCircle,
  RotateCcw,
  Fingerprint
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
import { useGuidedTips } from "@/contexts/GuidedTipsContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { 
  isPushSupported, 
  getPushPermission, 
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribedToPush 
} from "@/lib/pushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { resetBiometricPrompt } from "@/components/auth/BiometricPrompt";

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
  const { resetAllTips } = useGuidedTips();
  
  // Native app info state
  const [nativeInfo, setNativeInfo] = useState<{ version: string; build: string } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported] = useState(isPushSupported());
  const [biometricLoading, setBiometricLoading] = useState(false);

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enableBiometric,
    disableBiometric,
    getBiometryLabel,
  } = useBiometricAuth();

  // Fetch native app info on mount (iOS/Android)
  useEffect(() => {
    const fetchNativeInfo = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await App.getInfo();
          setNativeInfo({ version: info.version, build: info.build });
        } catch (error) {
          console.error("Failed to get native app info:", error);
        }
      }
    };
    
    if (open) {
      fetchNativeInfo();
    }
  }, [open]);

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

  const handleRestartTutorial = () => {
    resetAllTips();
    onOpenChange(false);
    toast({
      title: "Tutorial reiniciado",
      description: "As dicas guiadas serão exibidas novamente.",
    });
    // Navigate to home to trigger tips
    navigate("/");
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!user?.email) return;
    
    setBiometricLoading(true);
    try {
      if (enabled) {
        const success = await enableBiometric(user.email);
        if (success) {
          toast({
            title: `${getBiometryLabel()} ativado`,
            description: "Você pode usar biometria para entrar no app.",
          });
        }
      } else {
        disableBiometric();
        toast({
          title: `${getBiometryLabel()} desativado`,
          description: "Login biométrico foi desativado.",
        });
      }
    } catch (error) {
      console.error("Biometric toggle error:", error);
    } finally {
      setBiometricLoading(false);
    }
  };
  const handleSignOut = () => {
    // Reset biometric prompt so it shows again on next login
    resetBiometricPrompt();
    onSignOut();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-l border-border p-0 overflow-y-auto pt-safe">
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

          {/* Security / Biometric Section - Only on native */}
          {biometricAvailable && (
            <>
              <Separator className="bg-border" />
              
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Segurança
                  </h3>
                </div>
                
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-foreground font-medium">{getBiometryLabel()}</p>
                        <p className="text-xs text-muted-foreground">
                          Desbloqueio rápido ao abrir o app
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={biometricEnabled}
                      onCheckedChange={handleBiometricToggle}
                      disabled={biometricLoading}
                    />
                  </div>
                </div>
              </motion.section>
            </>
          )}

          <Separator className="bg-border" />

          {/* Help Section */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Ajuda
              </h3>
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <button 
                onClick={handleRestartTutorial}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-foreground font-medium">Ver dicas guiadas</p>
                    <p className="text-xs text-muted-foreground">
                      Reiniciar o tour de boas-vindas
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
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
                onClick={handleSignOut}
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

          {/* App Version with Build ID */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center pt-4 pb-8 space-y-1"
          >
            <p className="text-xs text-muted-foreground">
              Paddock v1.0.0
            </p>
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              web: {__WEB_BUILD_ID__}
              {nativeInfo && ` • app: ${nativeInfo.version} (${nativeInfo.build})`}
            </p>
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
