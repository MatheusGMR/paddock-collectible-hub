import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getConversations, ConversationWithDetails } from "@/lib/api/messages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  onSelectConversation: (conversationId: string, otherUser: ConversationWithDetails["other_user"]) => void;
  selectedConversationId?: string | null;
}

export const ConversationList = ({ 
  onSelectConversation, 
  selectedConversationId 
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground">
          Nenhuma conversa ainda
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Visite o perfil de um usuário para iniciar uma conversa
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv.id, conv.other_user)}
          className={cn(
            "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left",
            selectedConversationId === conv.id && "bg-muted/50"
          )}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={conv.other_user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {conv.other_user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-foreground truncate">
                {conv.other_user.username}
              </p>
              {conv.last_message && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(conv.last_message.created_at), {
                    addSuffix: false,
                    locale: ptBR,
                  })}
                </span>
              )}
            </div>
            {conv.last_message && (
              <p className={cn(
                "text-sm truncate",
                conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {conv.last_message.content}
              </p>
            )}
          </div>
          
          {conv.unread_count > 0 && (
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">
                {conv.unread_count > 9 ? "9+" : conv.unread_count}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};
