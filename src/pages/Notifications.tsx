import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { mockNotifications } from "@/data/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";
import { MessagesSheet } from "@/components/messages/MessagesSheet";

const Notifications = () => {
  const { t } = useLanguage();
  const [messagesOpen, setMessagesOpen] = useState(false);
  
  // Trigger guided tips for notifications screen
  useScreenTips("notifications", 600);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-lg px-4">
        <h1 className="text-lg font-semibold">{t.notifications.title}</h1>
        <button
          onClick={() => setMessagesOpen(true)}
          className="p-2 text-foreground-secondary hover:text-primary transition-colors"
          title="Mensagens"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </header>

      {/* Notification List */}
      <div className="divide-y divide-border">
        {mockNotifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>

      {/* Messages Sheet */}
      <MessagesSheet
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
      />
    </div>
  );
};

export default Notifications;
