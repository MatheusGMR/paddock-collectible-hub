import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Retrieve stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ confirmed: false, reason: "payment_not_paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find sales by session_id
    const { data: sales, error: salesErr } = await supabaseAdmin
      .from("sales")
      .select("id, listing_id, status, shipping_status")
      .eq("stripe_session_id", session_id);

    if (salesErr) throw salesErr;
    if (!sales || sales.length === 0) {
      return new Response(
        JSON.stringify({ confirmed: false, reason: "no_sales_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update all pending sales to completed
    const pendingSaleIds = sales.filter((s) => s.status === "pending").map((s) => s.id);
    const listingIds = sales.map((s) => s.listing_id);

    if (pendingSaleIds.length > 0) {
      // Update sales status
      await supabaseAdmin
        .from("sales")
        .update({ status: "completed", shipping_status: "confirmed" })
        .in("id", pendingSaleIds);

      // Mark listings as sold (inventory management)
      await supabaseAdmin
        .from("listings")
        .update({ status: "sold" })
        .in("id", listingIds);

      console.log(
        `Confirmed payment for session ${session_id}: ${pendingSaleIds.length} sales completed, ${listingIds.length} listings marked sold`
      );
    }

    return new Response(
      JSON.stringify({
        confirmed: true,
        sales_confirmed: pendingSaleIds.length,
        listings_sold: listingIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("confirm-payment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
