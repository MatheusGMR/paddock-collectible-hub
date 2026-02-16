import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { listing_ids } = await req.json();

    if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length === 0) {
      throw new Error("listing_ids array is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Fetch all listings
    const { data: listings, error: listingsError } = await supabaseClient
      .from("listings")
      .select("*")
      .in("id", listing_ids)
      .eq("status", "active");

    if (listingsError) throw listingsError;
    if (!listings || listings.length === 0) throw new Error("No active listings found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const lineItems = listings.map((listing) => ({
      price_data: {
        currency: listing.currency.toLowerCase(),
        product_data: {
          name: listing.title,
          description: listing.description || undefined,
          images: listing.image_url ? [listing.image_url] : undefined,
        },
        unit_amount: Math.round(listing.price * 100),
      },
      quantity: 1,
    }));

    const origin = req.headers.get("origin") || "https://paddock-collectible-hub.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&cart=true`,
      cancel_url: `${origin}/payment-canceled?cart=true`,
      metadata: {
        listing_ids: JSON.stringify(listing_ids),
        user_id: user.id,
        is_cart: "true",
      },
    });

    // Record sales for each listing with fee calculation
    const salesRecords = listings
      .filter((listing) => listing.user_id)
      .map((listing) => {
        const fees = calculateFees(listing.price);
        return {
          listing_id: listing.id,
          seller_id: listing.user_id,
          buyer_id: user.id,
          sale_price: listing.price,
          currency: listing.currency,
          ...fees,
          stripe_session_id: session.id,
          status: "pending",
        };
      });

    if (salesRecords.length > 0) {
      await supabaseAdmin.from("sales").insert(salesRecords);
    }

    // Clear cart items
    await supabaseClient
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .in("listing_id", listing_ids);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Cart payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
