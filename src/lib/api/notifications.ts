import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow" | "mention";
  post_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    username: string;
    avatar_url: string | null;
  };
  post?: {
    image_url: string;
  };
}

// Fetch notifications for current user
export async function getNotifications(limit = 50): Promise<Notification[]> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.session.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }

  // Fetch actor profiles
  const actorIds = [...new Set(data?.map((n) => n.actor_id) || [])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, username, avatar_url")
    .in("user_id", actorIds);

  // Fetch posts for notifications with post_id
  const postIds = data?.filter((n) => n.post_id).map((n) => n.post_id) || [];
  const { data: posts } = await supabase
    .from("posts")
    .select("id, image_url")
    .in("id", postIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
  const postMap = new Map(posts?.map((p) => [p.id, p]) || []);

  return (data || []).map((n) => ({
    ...n,
    type: n.type as Notification["type"],
    actor: profileMap.get(n.actor_id) || undefined,
    post: n.post_id ? postMap.get(n.post_id) || undefined : undefined,
  }));
}

// Create a notification with push
export async function createNotification(params: {
  userId: string;
  type: Notification["type"];
  postId?: string;
  message?: string;
}): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const actorId = session.session?.user?.id;

  if (!actorId) return;

  // Don't notify yourself
  if (actorId === params.userId) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    actor_id: actorId,
    type: params.type,
    post_id: params.postId || null,
    message: params.message || null,
  });

  if (error) {
    console.error("Error creating notification:", error);
    return;
  }

  // Send push notification
  try {
    // Get actor username
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", actorId)
      .single();

    const actorName = actorProfile?.username || "Alguém";
    let pushTitle = "Paddock";
    let pushBody = "Nova interação!";
    let carName: string | null = null;

    // For likes, try to get the car name from the post's collection item
    if (params.type === "like" && params.postId) {
      const { data: post } = await supabase
        .from("posts")
        .select("collection_item_id")
        .eq("id", params.postId)
        .single();

      if (post?.collection_item_id) {
        const { data: collectionItem } = await supabase
          .from("user_collection")
          .select("item_id")
          .eq("id", post.collection_item_id)
          .single();

        if (collectionItem?.item_id) {
          const { data: item } = await supabase
            .from("items")
            .select("real_car_brand, real_car_model")
            .eq("id", collectionItem.item_id)
            .single();

          if (item) {
            carName = `${item.real_car_brand} ${item.real_car_model}`;
          }
        }
      }
    }

    // Set push content based on type
    switch (params.type) {
      case "like":
        if (carName) {
          pushTitle = `${carName} recebeu uma curtida ❤️`;
          pushBody = `${actorName} curtiu seu ${carName}`;
        } else {
          pushTitle = "Nova curtida ❤️";
          pushBody = `${actorName} curtiu sua publicação`;
        }
        break;
      case "comment":
        pushTitle = "Novo comentário 💬";
        pushBody = `${actorName} comentou na sua publicação`;
        break;
      case "follow":
        pushTitle = "Novo seguidor 👤";
        pushBody = `${actorName} começou a seguir você`;
        break;
      case "mention":
        pushTitle = "Você foi mencionado 📣";
        pushBody = `${actorName} mencionou você em uma publicação`;
        break;
    }

    await supabase.functions.invoke("send-push", {
      body: {
        userId: params.userId,
        title: pushTitle,
        body: pushBody,
        url: "/notifications",
      },
    });
  } catch (pushError) {
    console.error("Error sending push notification:", pushError);
    // Don't fail the notification creation if push fails
  }
}

// Mark notifications as read
export async function markNotificationsAsRead(): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return;

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.session.user.id)
    .eq("is_read", false);
}

// Get unread count
export async function getUnreadCount(): Promise<number> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.session.user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread count:", error);
    return 0;
  }

  return count || 0;
}

// Subscribe to new notifications
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        const newNotif = payload.new as Notification;
        // Fetch actor info
        const { data: actor } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("user_id", newNotif.actor_id)
          .single();

        onNotification({
          ...newNotif,
          type: newNotif.type as Notification["type"],
          actor: actor || undefined,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Like a post
export async function likePost(postId: string, postOwnerId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return false;

  const { error } = await supabase.from("post_likes").insert({
    post_id: postId,
    user_id: session.session.user.id,
  });

  if (error) {
    if (error.code === "23505") {
      // Already liked
      return false;
    }
    console.error("Error liking post:", error);
    return false;
  }

  // Create notification for post owner
  await createNotification({
    userId: postOwnerId,
    type: "like",
    postId,
  });

  return true;
}

// Unlike a post
export async function unlikePost(postId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return false;

  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", session.session.user.id);

  if (error) {
    console.error("Error unliking post:", error);
    return false;
  }

  return true;
}

// Check if current user liked a post
export async function hasLikedPost(postId: string): Promise<boolean> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user?.id) return false;

  const { data, error } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", session.session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Error checking like:", error);
    return false;
  }

  return !!data;
}
