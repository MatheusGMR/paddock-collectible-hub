import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CLAIM-CHALLENGE-REWARD] ${step}${detailsStr}`);
};

// Coupon ID for 50% off (will be created if doesn't exist)
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has completed the challenge
    const { data: subscription, error: subError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription) {
      throw new Error("No subscription found for user");
    }

    if (!subscription.challenge_completed_at) {
      throw new Error("Challenge not completed yet");
    }

    if (subscription.challenge_rewarded) {
      logStep("Reward already claimed");
      return new Response(JSON.stringify({ success: true, message: "Reward already claimed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Challenge completed, applying reward", { completedAt: subscription.challenge_completed_at });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get or create the 50% off coupon
    let coupon;
    try {
      coupon = await stripe.coupons.retrieve(CHALLENGE_COUPON_ID);
      logStep("Found existing coupon", { couponId: coupon.id });
    } catch {
      // Create coupon if it doesn't exist
      coupon = await stripe.coupons.create({
        id: CHALLENGE_COUPON_ID,
        percent_off: 50,
        duration: "forever",
        name: "Desafio 50 Carrinhos - 50% OFF",
      });
      logStep("Created new coupon", { couponId: coupon.id });
    }

    // If user has a Stripe customer ID, apply the discount
    if (subscription.stripe_customer_id) {
      const customerId = subscription.stripe_customer_id;
      
      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const stripeSubscription = subscriptions.data[0];
        
        // Apply coupon to subscription
        await stripe.subscriptions.update(stripeSubscription.id, {
          coupon: CHALLENGE_COUPON_ID,
        });
        logStep("Applied coupon to subscription", { subscriptionId: stripeSubscription.id });

        // Add a credit for the first month (effectively making it free)
        // Calculate prorated amount for one month
        const invoicePreview = await stripe.invoices.retrieveUpcoming({
          customer: customerId,
        });
        
        if (invoicePreview.amount_due > 0) {
          // Create a credit note or adjust balance
          await stripe.customers.update(customerId, {
            balance: -invoicePreview.amount_due, // Negative balance = credit
          });
          logStep("Applied first month credit", { creditAmount: invoicePreview.amount_due });
        }
      }
    }

    // Mark reward as claimed in database
    const { error: updateError } = await supabaseClient
      .from("user_subscriptions")
      .update({
        challenge_rewarded: true,
        discount_applied: true,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating subscription", { error: updateError.message });
    }

    logStep("Reward claimed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Reward claimed! First month free + 50% permanent discount applied." 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in claim-challenge-reward", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
