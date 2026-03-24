import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_FEE_FIXED = 1.99;
const PLATFORM_FEE_PERCENT = 4.99;

function calculateFees(salePrice: number) {
  const percentFee = salePrice * (PLATFORM_FEE_PERCENT / 100);
  const totalFee = PLATFORM_FEE_FIXED + percentFee;
  const sellerNet = salePrice - totalFee;
  return {
    platform_fee_fixed: PLATFORM_FEE_FIXED,
    platform_fee_percent: PLATFORM_FEE_PERCENT,
    platform_fee_total: Math.round(totalFee * 100) / 100,
    seller_net: Math.round(sellerNet * 100) / 100,
  };
}

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

    const metadata = session.metadata || {};
    const listingId = metadata.listing_id;
    const userId = metadata.user_id;
    const sellerId = metadata.seller_id;

    // Check if sale already exists for this session (idempotency)
    const { data: existingSales } = await supabaseAdmin
      .from("sales")
      .select("id")
      .eq("stripe_session_id", session_id);

    if (existingSales && existingSales.length > 0) {
      return new Response(
        JSON.stringify({ confirmed: true, sales_confirmed: existingSales.length, already_processed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!listingId || !userId || !sellerId) {
      return new Response(
        JSON.stringify({ confirmed: false, reason: "missing_metadata" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get listing to calculate fees
    const { data: listing } = await supabaseAdmin
      .from("listings")
      .select("price, currency")
      .eq("id", listingId)
      .single();

    if (!listing) {
      return new Response(
        JSON.stringify({ confirmed: false, reason: "listing_not_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fees = calculateFees(listing.price);

    // Create the sale record as completed (payment already confirmed)
    await supabaseAdmin.from("sales").insert({
      listing_id: listingId,
      seller_id: sellerId,
      buyer_id: userId,
      sale_price: listing.price,
      currency: listing.currency || "BRL",
      ...fees,
      stripe_session_id: session_id,
      status: "completed",
      shipping_status: "confirmed",
    });

    // Mark listing as sold
    await supabaseAdmin
      .from("listings")
      .update({ status: "sold" })
      .eq("id", listingId);

    console.log(`Payment confirmed for session ${session_id}: sale created, listing ${listingId} marked sold`);

    return new Response(
      JSON.stringify({
        confirmed: true,
        sales_confirmed: 1,
        listings_sold: 1,
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
