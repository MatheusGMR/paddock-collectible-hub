import { useState } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";
import { ConversationWithDetails } from "@/lib/api/messages";

interface MessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConversationId?: string | null;
  initialOtherUser?: ConversationWithDetails["other_user"] | null;
}

export const MessagesSheet = ({ 
  open, 
  onOpenChange,
  initialConversationId,
  initialOtherUser,
}: MessagesSheetProps) => {
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    otherUser: ConversationWithDetails["other_user"];
  } | null>(
    initialConversationId && initialOtherUser 
      ? { id: initialConversationId, otherUser: initialOtherUser }
      : null
  );

  const handleSelectConversation = (
    conversationId: string, 
    otherUser: ConversationWithDetails["other_user"]
  ) => {
    setSelectedConversation({ id: conversationId, otherUser });
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setSelectedConversation(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="h-[90vh] max-h-[90vh]">
        {selectedConversation ? (
          <ChatView
            conversationId={selectedConversation.id}
            otherUser={selectedConversation.otherUser}
            onBack={handleBack}
          />
        ) : (
          <>
            <DrawerHeader className="border-b border-border">
              <DrawerTitle className="text-center">Mensagens</DrawerTitle>
              <DrawerClose className="absolute right-4 top-4">
                <X className="h-5 w-5" />
              </DrawerClose>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                onSelectConversation={handleSelectConversation}
                selectedConversationId={selectedConversation?.id}
              />
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};
