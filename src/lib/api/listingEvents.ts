import { supabase } from "@/integrations/supabase/client";

export type ListingEventType = "view" | "cart_add" | "buy_click" | "share";

export const trackListingEvent = async (
  listingId: string,
  eventType: ListingEventType
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("listing_events").insert({
      listing_id: listingId,
      user_id: user?.id || null,
      event_type: eventType,
    });
  } catch (e) {
    // Silent fail — analytics shouldn't break UX
    console.warn("Failed to track listing event:", e);
  }
};
