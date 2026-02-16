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
    const { listing_id } = await req.json();

    if (!listing_id) {
      throw new Error("listing_id is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Service role client for inserting sales
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }

    // Get authenticated user
    let userEmail: string | undefined;
    let userId: string | undefined;
    let customerId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userEmail = data.user?.email;
      userId = data.user?.id;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    const amountInCents = Math.round(listing.price * 100);
    const origin = req.headers.get("origin") || "https://paddock-collectible-hub.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: listing.currency.toLowerCase(),
            product_data: {
              name: listing.title,
              description: listing.description || undefined,
              images: listing.image_url ? [listing.image_url] : undefined,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listing_id}`,
      cancel_url: `${origin}/payment-canceled?listing_id=${listing_id}`,
      metadata: {
        listing_id: listing_id,
        listing_title: listing.title,
        user_id: userId || "",
        seller_id: listing.user_id || "",
      },
    });

    // Record the sale with fee calculation
    if (userId && listing.user_id) {
      const fees = calculateFees(listing.price);
      await supabaseAdmin.from("sales").insert({
        listing_id: listing_id,
        seller_id: listing.user_id,
        buyer_id: userId,
        sale_price: listing.price,
        currency: listing.currency,
        ...fees,
        stripe_session_id: session.id,
        status: "pending",
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
