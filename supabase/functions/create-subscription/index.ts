import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Paddock Premium price ID (Production)
const PREMIUM_PRICE_ID = "price_1SwrJfAmjEfh8Sz78f61BFur";
// Coupon for 50% off challenge winners
const CHALLENGE_COUPON_ID = "PADDOCK_50_OFF_CHALLENGE";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body to check for embedded mode
    let embedded = false;
    try {
      const body = await req.json();
      embedded = body?.embedded === true;
    } catch {
      // No body or invalid JSON - default to redirect mode
    }
    logStep("Checkout mode", { embedded });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if user has completed the challenge (50 cars)
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select("challenge_completed_at, challenge_rewarded, discount_applied")
      .eq("user_id", user.id)
      .single();

    const challengeCompleted = !!subscription?.challenge_completed_at;
    logStep("Challenge status", { challengeCompleted, rewarded: subscription?.challenge_rewarded });

    // Check if customer already exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Get origin for redirect URLs
    const origin = req.headers.get("origin") || "https://paddock-collectible-hub.lovable.app";

    // Determine trial period and coupon based on challenge completion
    let trialDays = 7; // Default trial
    let couponId: string | undefined;

    if (challengeCompleted) {
      // Challenge completed: 30 days free (1st month) + 50% off coupon
      trialDays = 30; // First month free
      
      // Ensure the coupon exists
      try {
        await stripe.coupons.retrieve(CHALLENGE_COUPON_ID);
        logStep("Found existing challenge coupon");
      } catch {
        // Create coupon if it doesn't exist
        await stripe.coupons.create({
          id: CHALLENGE_COUPON_ID,
          percent_off: 50,
          duration: "forever",
          name: "Desafio 50 Carrinhos - 50% OFF Permanente",
        });
        logStep("Created challenge coupon");
      }
      
      couponId = CHALLENGE_COUPON_ID;
      logStep("Applying challenge rewards", { trialDays, couponId });
    }

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: trialDays,
        metadata: {
          user_id: user.id,
          challenge_completed: challengeCompleted ? "true" : "false",
        },
      },
      metadata: {
        user_id: user.id,
      },
    };

    // Configure based on embedded or redirect mode
    if (embedded) {
      sessionConfig.ui_mode = "embedded";
      sessionConfig.return_url = `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionConfig.success_url = `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = `${origin}/`;
    }

    // Add coupon/discount if challenge was completed
    if (couponId) {
      sessionConfig.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { 
      sessionId: session.id, 
      url: session.url,
      clientSecret: embedded ? "present" : "n/a",
      trialDays,
      hasCoupon: !!couponId
    });

    // If challenge completed and not yet marked as rewarded, update it
    if (challengeCompleted && !subscription?.challenge_rewarded) {
      await supabaseClient
        .from("user_subscriptions")
        .update({
          challenge_rewarded: true,
          discount_applied: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      logStep("Marked challenge as rewarded in database");
    }

    // Return appropriate response based on mode
    if (embedded) {
      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
