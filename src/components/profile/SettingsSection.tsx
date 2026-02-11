import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useGuidedTips } from "@/contexts/GuidedTipsContext";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { 
  isPushSupported, 
  requestPushPermission,
  subscribeToPush, 
  unsubscribeFromPush, 
  isSubscribedToPush 
} from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { resetBiometricPrompt } from "@/components/auth/BiometricPrompt";
import { SubscriptionSheet } from "@/components/profile/SubscriptionSheet";

declare const __WEB_BUILD_ID__: string;

interface SettingsSectionProps {
  onSignOut: () => void;
}

export const SettingsSection = ({ onSignOut }: SettingsSectionProps) => {
  const { user } = useAuth();
  const { status, daysLeft } = useSubscription();
  const { isAdmin } = useAdmin();
  const { resetAllTips } = useGuidedTips();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [nativeInfo, setNativeInfo] = useState<{ version: string; build: string } | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported] = useState(isPushSupported() || Capacitor.isNativePlatform());
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [subscriptionSheetOpen, setSubscriptionSheetOpen] = useState(false);

  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    enableBiometric,
    disableBiometric,
    getBiometryLabel,
  } = useBiometricAuth();

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
    fetchNativeInfo();
  }, []);

  useEffect(() => {
    const checkPushStatus = async () => {
      console.log('[Settings] Checking push status. pushSupported:', pushSupported, 'isNative:', Capacitor.isNativePlatform());
      if (pushSupported) {
        const subscribed = await isSubscribedToPush();
        console.log('[Settings] Push subscribed:', subscribed);
        setPushEnabled(subscribed);
      }
    };
    checkPushStatus();
  }, [pushSupported]);

  const handlePushToggle = async (enabled: boolean) => {
    console.log('[Settings] Push toggle called:', enabled, 'user:', !!user, 'pushSupported:', pushSupported);
    if (!user) {
      console.log('[Settings] No user, aborting push toggle');
      return;
    }
    setPushLoading(true);
    try {
      if (enabled) {
        if (Capacitor.isNativePlatform()) {
          // On native, subscribeToPush handles permission + registration in one step
          // Avoids separate checkPermissions() call that can trigger biometric re-auth
          console.log('[Settings] Native: calling subscribeToPush directly...');
          const success = await subscribeToPush(user.id);
          console.log('[Settings] subscribeToPush result:', success);
          if (!success) {
            toast({
              title: "Erro",
              description: "Não foi possível ativar as notificações. Verifique as permissões nas configurações do dispositivo.",
              variant: "destructive",
            });
          } else {
            setPushEnabled(true);
            toast({ title: "Notificações ativadas!" });
          }
        } else {
          // Web: need explicit permission request first
          const permission = await requestPushPermission();
          console.log('[Settings] Permission result:', permission);
          if (permission !== 'granted') {
            toast({
              title: "Permissão negada",
              description: "Habilite as notificações nas configurações do navegador",
              variant: "destructive",
            });
            setPushLoading(false);
            return;
          }
          const success = await subscribeToPush(user.id);
          setPushEnabled(success);
          if (success) toast({ title: "Notificações ativadas!" });
        }
      } else {
        const success = await unsubscribeFromPush();
        if (success) {
          setPushEnabled(false);
          toast({ title: "Notificações desativadas" });
        }
      }
    } catch (error) {
      console.error("Push notification toggle error:", error);
      toast({ title: "Erro", description: "Não foi possível alterar as notificações", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const getSubscriptionStatus = () => {
    if (status === "active") return { label: "Premium", color: "text-primary" };
    if (status === "trial" && daysLeft > 0) return { label: `Trial (${daysLeft}d)`, color: "text-amber-500" };
    if (status === "expired" || status === "canceled") return { label: "Expirado", color: "text-destructive" };
    return { label: "Gratuito", color: "text-muted-foreground" };
  };

  const subscriptionStatus = getSubscriptionStatus();

  const handleRestartTutorial = () => {
    resetAllTips();
    toast({ title: "Tutorial reiniciado", description: "As dicas guiadas serão exibidas novamente." });
    navigate("/");
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!user?.email) return;
    setBiometricLoading(true);
    try {
      if (enabled) {
        const success = await enableBiometric(user.email);
        if (success) toast({ title: `${getBiometryLabel()} ativado`, description: "Você pode usar biometria para entrar no app." });
      } else {
        disableBiometric();
        toast({ title: `${getBiometryLabel()} desativado`, description: "Login biométrico foi desativado." });
      }
    } catch (error) {
      console.error("Biometric toggle error:", error);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSignOut = () => {
    resetBiometricPrompt();
    onSignOut();
  };

  return (
    <div className="space-y-6">
      {/* Language */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Idioma</h3>
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
        <p className="text-xs text-muted-foreground mt-2 px-1">O app está configurado apenas em Português</p>
      </motion.section>

      <Separator className="bg-border" />

      {/* Notifications */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Notificações</h3>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-medium">Notificações Push</p>
                <p className="text-xs text-muted-foreground">Alertas de lançamentos e novidades</p>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} disabled={!pushSupported || pushLoading} />
          </div>
          {!pushSupported && !Capacitor.isNativePlatform() && (
            <div className="px-4 pb-4">
              <p className="text-xs text-amber-500">Push não suportado neste navegador</p>
            </div>
          )}
        </div>
      </motion.section>

      {/* Biometric */}
      {biometricAvailable && (
        <>
          <Separator className="bg-border" />
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Segurança</h3>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{getBiometryLabel()}</p>
                    <p className="text-xs text-muted-foreground">Desbloqueio rápido ao abrir o app</p>
                  </div>
                </div>
                <Switch checked={biometricEnabled} onCheckedChange={handleBiometricToggle} disabled={biometricLoading} />
              </div>
            </div>
          </motion.section>
        </>
      )}

      <Separator className="bg-border" />

      {/* Help */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Ajuda</h3>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <button onClick={handleRestartTutorial} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-foreground font-medium">Ver dicas guiadas</p>
                <p className="text-xs text-muted-foreground">Reiniciar o tour de boas-vindas</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </motion.section>

      <Separator className="bg-border" />

      {/* Account */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="flex items-center gap-2 mb-3">
          <User className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Conta</h3>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-foreground font-medium">Email</p>
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user?.email || "—"}</p>
            </div>
          </div>
          <button onClick={() => setSubscriptionSheetOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-foreground font-medium">Assinatura</p>
                <p className={`text-xs ${subscriptionStatus.color}`}>{subscriptionStatus.label}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {isAdmin && (
            <button onClick={() => navigate("/admin")} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-foreground font-medium">Painel Admin</p>
                  <p className="text-xs text-muted-foreground">Métricas e gerenciamento</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}

          <button onClick={handleSignOut} className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors group">
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

      {/* Version */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center pt-4 pb-8 space-y-1">
        <p className="text-xs text-muted-foreground">Paddock v1.0.0</p>
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          web: {__WEB_BUILD_ID__}
          {nativeInfo && ` • app: ${nativeInfo.version} (${nativeInfo.build})`}
        </p>
      </motion.div>

      <SubscriptionSheet open={subscriptionSheetOpen} onOpenChange={setSubscriptionSheetOpen} />
    </div>
  );
};
