import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing_id } = await req.json();

    if (!listing_id) {
      throw new Error("listing_id is required");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch listing details from database
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found");
    }

    // Try to get user from auth header (optional - supports guest checkout)
    let userEmail: string | undefined;
    let customerId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      userEmail = data.user?.email;
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if a Stripe customer already exists for this user
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      }
    }

    // Convert price to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(listing.price * 100);

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://paddock-collectible-hub.lovable.app";

    // Create Stripe Checkout session
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
      },
    });

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
