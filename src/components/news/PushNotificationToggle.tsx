import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import {
  isPushSupported,
  getPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribedToPush,
  type PushSubscribeResult,
} from "@/lib/pushNotifications";

const reasonMessages: Record<string, { title: string; description: string }> = {
  iframe_context: {
    title: "Ambiente restrito",
    description: "Abra o app diretamente no navegador para ativar notificações",
  },
  sw_failed: {
    title: "Erro no serviço",
    description: "Erro ao registrar serviço de notificações. Tente recarregar a página",
  },
  vapid_missing: {
    title: "Configuração incompleta",
    description: "Configuração do servidor incompleta. Contate o suporte",
  },
  permission_denied: {
    title: "Permissão negada",
    description: "Habilite as notificações nas configurações do navegador/dispositivo",
  },
  token_timeout: {
    title: "Timeout",
    description: "Não foi possível registrar o dispositivo. Verifique sua conexão",
  },
  edge_function_error: {
    title: "Erro no servidor",
    description: "Erro ao salvar inscrição. Tente novamente",
  },
  not_supported: {
    title: "Não suportado",
    description: "Notificações push não são suportadas neste ambiente",
  },
};

export const PushNotificationToggle = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      const supported = isPushSupported() || Capacitor.isNativePlatform();
      setIsSupported(supported);
      
      if (supported && isPushSupported()) {
        setPermission(getPushPermission());
        const subscribed = await isSubscribedToPush();
        setIsEnabled(subscribed);
      }
      
      setIsLoading(false);
    };
    
    checkStatus();
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!user) {
      toast({
        title: t.news?.push?.loginRequired || "Login necessário",
        description: t.news?.push?.loginRequiredDesc || "Faça login para receber notificações",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (checked) {
        // Unified: subscribeToPush now handles permission internally
        const result: PushSubscribeResult = await subscribeToPush(user.id);
        
        if (result.success) {
          setIsEnabled(true);
          setPermission('granted');
          toast({
            title: t.news?.push?.enabled || "Notificações ativadas!",
            description: t.news?.push?.enabledDesc || "Você receberá alertas de novos lançamentos",
          });
        } else {
          const msg = result.reason ? reasonMessages[result.reason] : null;
          toast({
            title: msg?.title || t.news?.push?.error || "Erro",
            description: msg?.description || t.news?.push?.errorDesc || "Não foi possível ativar as notificações",
            variant: "destructive",
          });
        }
      } else {
        const success = await unsubscribeFromPush();
        
        if (success) {
          setIsEnabled(false);
          toast({
            title: t.news?.push?.disabled || "Notificações desativadas",
            description: t.news?.push?.disabledDesc || "Você não receberá mais alertas",
          });
        }
      }
    } catch (error) {
      console.error('Toggle push error:', error);
      toast({
        title: t.news?.push?.error || "Erro",
        description: t.news?.push?.errorDesc || "Não foi possível alterar as notificações",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3 opacity-50">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <div>
            <Label className="text-sm font-medium">
              {t.news?.push?.title || "Notificações Push"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t.news?.push?.notSupported || "Não suportado neste navegador"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {isEnabled ? (
          <Bell className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <Label htmlFor="push-toggle" className="text-sm font-medium cursor-pointer">
            {t.news?.push?.title || "Alertas de Lançamentos"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {isEnabled 
              ? (t.news?.push?.activeDesc || "Receba alertas de novos lançamentos")
              : (t.news?.push?.inactiveDesc || "Ative para receber alertas")
            }
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <Switch
          id="push-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={permission === 'denied'}
        />
      )}
    </div>
  );
};
