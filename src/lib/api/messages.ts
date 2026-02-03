import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface ConversationWithDetails {
  id: string;
  updated_at: string;
  other_user: {
    user_id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message: Message | null;
  unread_count: number;
}

// Get or create a conversation with another user
export async function getOrCreateConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase
    .rpc("find_or_create_conversation", { other_user_id: otherUserId });

  if (error) {
    console.error("Error finding/creating conversation:", error);
    throw error;
  }

  return data;
}

// Get all conversations for current user
export async function getConversations(): Promise<ConversationWithDetails[]> {
  const { data: session } = await supabase.auth.getSession();
  const currentUserId = session.session?.user?.id;
  
  if (!currentUserId) {
    throw new Error("User not authenticated");
  }

  // Get conversations where user is participant
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", currentUserId);

  if (partError) throw partError;
  if (!participations?.length) return [];

  const conversationIds = participations.map(p => p.conversation_id);

  // Get conversation details
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id, updated_at")
    .in("id", conversationIds)
    .order("updated_at", { ascending: false });

  if (convError) throw convError;
  if (!conversations?.length) return [];

  // Get other participants
  const { data: allParticipants, error: allPartError } = await supabase
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds)
    .neq("user_id", currentUserId);

  if (allPartError) throw allPartError;

  // Get other users profiles
  const otherUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
  
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", otherUserIds);

  if (profileError) throw profileError;

  // Get last message for each conversation
  const { data: lastMessages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (msgError) throw msgError;

  // Get unread counts
  const { data: unreadMessages, error: unreadError } = await supabase
    .from("messages")
    .select("conversation_id")
    .in("conversation_id", conversationIds)
    .neq("sender_id", currentUserId)
    .is("read_at", null);

  if (unreadError) throw unreadError;

  // Build conversation details
  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
  const participantMap = new Map(allParticipants?.map(p => [p.conversation_id, p.user_id]) || []);
  
  // Group messages by conversation and get first (latest)
  const lastMessageMap = new Map<string, Message>();
  lastMessages?.forEach(msg => {
    if (!lastMessageMap.has(msg.conversation_id)) {
      lastMessageMap.set(msg.conversation_id, msg);
    }
  });

  // Count unread per conversation
  const unreadCountMap = new Map<string, number>();
  unreadMessages?.forEach(msg => {
    const count = unreadCountMap.get(msg.conversation_id) || 0;
    unreadCountMap.set(msg.conversation_id, count + 1);
  });

  return conversations.map(conv => {
    const otherUserId = participantMap.get(conv.id);
    const otherProfile = otherUserId ? profileMap.get(otherUserId) : null;
    
    return {
      id: conv.id,
      updated_at: conv.updated_at,
      other_user: {
        user_id: otherUserId || "",
        username: otherProfile?.username || "Usuário",
        avatar_url: otherProfile?.avatar_url || null,
      },
      last_message: lastMessageMap.get(conv.id) || null,
      unread_count: unreadCountMap.get(conv.id) || 0,
    };
  });
}

// Get messages for a conversation
export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Send a message
export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  const { data: session } = await supabase.auth.getSession();
  const senderId = session.session?.user?.id;
  
  if (!senderId) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const currentUserId = session.session?.user?.id;
  
  if (!currentUserId) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);

  // Update last_read_at for participant
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", currentUserId);
}

// Subscribe to new messages in a conversation
export function subscribeToMessages(
  conversationId: string,
  onMessage: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
