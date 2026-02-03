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
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Reward already claimed",
        already_claimed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Challenge completed, applying reward", { completedAt: subscription.challenge_completed_at });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Ensure the 50% off coupon exists
    try {
      await stripe.coupons.retrieve(CHALLENGE_COUPON_ID);
      logStep("Found existing coupon", { couponId: CHALLENGE_COUPON_ID });
    } catch {
      // Create coupon if it doesn't exist
      await stripe.coupons.create({
        id: CHALLENGE_COUPON_ID,
        percent_off: 50,
        duration: "forever",
        name: "Desafio 50 Carrinhos - 50% OFF Permanente",
      });
      logStep("Created new coupon", { couponId: CHALLENGE_COUPON_ID });
    }

    // If user has a Stripe customer ID and active subscription, apply discount
    if (subscription.stripe_customer_id) {
      const customerId = subscription.stripe_customer_id;
      logStep("Found Stripe customer", { customerId });
      
      // Get active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const stripeSubscription = subscriptions.data[0];
        
        // Check if coupon is already applied
        if (!stripeSubscription.discount?.coupon) {
          // Apply coupon to subscription
          await stripe.subscriptions.update(stripeSubscription.id, {
            coupon: CHALLENGE_COUPON_ID,
          });
          logStep("Applied coupon to subscription", { subscriptionId: stripeSubscription.id });
        } else {
          logStep("Subscription already has a discount applied");
        }

        // Add a credit for the first month (effectively making it free)
        try {
          const invoicePreview = await stripe.invoices.retrieveUpcoming({
            customer: customerId,
          });
          
          if (invoicePreview.amount_due > 0) {
            // Apply credit equal to next invoice amount (1 month free)
            const currentBalance = (await stripe.customers.retrieve(customerId) as Stripe.Customer).balance || 0;
            const newBalance = currentBalance - invoicePreview.amount_due;
            
            await stripe.customers.update(customerId, {
              balance: newBalance, // Negative balance = credit
            });
            logStep("Applied first month credit", { 
              creditAmount: invoicePreview.amount_due,
              newBalance 
            });
          }
        } catch (invoiceError) {
          // No upcoming invoice (trial still active), that's fine
          logStep("No upcoming invoice to credit (probably still in trial)");
        }
      } else {
        logStep("No active subscription found - rewards will apply on next checkout");
      }
    } else {
      logStep("No Stripe customer yet - rewards will apply on checkout");
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
      message: "Reward claimed! First month free + 50% permanent discount applied.",
      rewards: {
        first_month_free: true,
        permanent_discount: 50,
      }
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
