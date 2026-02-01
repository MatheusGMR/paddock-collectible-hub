import { NotificationItem } from "@/components/notifications/NotificationItem";
import { mockNotifications } from "@/data/mockData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenTips } from "@/hooks/useScreenTips";

const Notifications = () => {
  const { t } = useLanguage();
  
  // Trigger guided tips for notifications screen
  useScreenTips("notifications", 600);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/95 backdrop-blur-lg px-4">
        <h1 className="text-lg font-semibold">{t.notifications.title}</h1>
      </header>

      {/* Notification List */}
      <div className="divide-y divide-border">
        {mockNotifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
};

export default Notifications;
