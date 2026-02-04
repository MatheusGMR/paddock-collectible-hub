import { useState, useEffect, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { PaddockLogo } from "@/components/icons/PaddockLogo";
import { MessagesSheet } from "@/components/messages/MessagesSheet";
import { getTotalUnreadCount, subscribeToConversationUpdates } from "@/lib/api/messages";
import { useAuth } from "@/contexts/AuthContext";

export const FeedHeader = () => {
  const { user } = useAuth();
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;
    const count = await getTotalUnreadCount();
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    loadUnreadCount();

    // Subscribe to message updates for badge
    const unsubscribe = subscribeToConversationUpdates(() => {
      loadUnreadCount();
    });

    return unsubscribe;
  }, [user, loadUnreadCount]);

  const handleMessagesOpen = (open: boolean) => {
    setMessagesOpen(open);
    // Refresh unread count when closing messages sheet
    if (!open) {
      loadUnreadCount();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-lg pt-safe">
        <div className="flex h-14 items-center justify-between px-4">
          <PaddockLogo variant="wordmark" size={30} />
          <button 
            onClick={() => setMessagesOpen(true)}
            className="relative p-2 text-foreground hover:text-primary transition-colors"
            title="Mensagens"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
            )}
          </button>
        </div>
      </header>

      <MessagesSheet
        open={messagesOpen}
        onOpenChange={handleMessagesOpen}
      />
    </>
  );
};
