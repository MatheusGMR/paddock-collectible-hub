import { useState, useEffect } from "react";
import { MessageCircle, Loader2, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";
import { MessagesSheet } from "@/components/messages/MessagesSheet";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getNotifications, 
  markNotificationsAsRead, 
  subscribeToNotifications,
  Notification 
} from "@/lib/api/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const getNotificationMessage = (type: Notification["type"]): string => {
  switch (type) {
    case "like":
      return "curtiu sua publicação";
    case "comment":
      return "comentou na sua publicação";
    case "follow":
      return "começou a seguir você";
    case "mention":
      return "mencionou você em uma publicação";
    default:
      return "interagiu com você";
  }
};

const Notifications = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Trigger guided tips for notifications screen
  useScreenTips("notifications", 600);

  useEffect(() => {
    if (user) {
      loadNotifications();
      markNotificationsAsRead();

      // Subscribe to new notifications
      const unsubscribe = subscribeToNotifications(user.id, (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
      });

      return unsubscribe;
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actor_id) {
      navigate(`/user/${notification.actor_id}`);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-lg pt-safe">
        <div className="flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">{t.notifications.title}</h1>
          <button
            onClick={() => setMessagesOpen(true)}
            className="p-2 text-foreground-secondary hover:text-primary transition-colors"
            title="Mensagens"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-foreground">
            Nenhuma notificação ainda
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Quando alguém curtir ou comentar seus posts, você verá aqui
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((notification) => (
            <button 
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 w-full hover:bg-muted/50 transition-colors text-left",
                !notification.is_read && "bg-primary/5"
              )}
            >
              {/* Avatar */}
              <Avatar className="h-11 w-11">
                <AvatarImage 
                  src={notification.actor?.avatar_url || undefined} 
                  alt={notification.actor?.username} 
                />
                <AvatarFallback className="bg-muted">
                  {notification.actor?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">
                    {notification.actor?.username || "Usuário"}
                  </span>{" "}
                  <span className="text-foreground/80">
                    {getNotificationMessage(notification.type)}
                  </span>
                </p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>

              {/* Post Thumbnail */}
              {notification.post && (
                <div className="h-11 w-11 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  <img 
                    src={notification.post.image_url} 
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Messages Sheet */}
      <MessagesSheet
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
      />
    </div>
  );
};

export default Notifications;
