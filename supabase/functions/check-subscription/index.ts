import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

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
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // VIP users exempt from subscription (lifetime access)
    const VIP_EMAILS = [
      "matheusmotaroldan@hotmail.com",
    ];
    
    if (VIP_EMAILS.includes(user.email.toLowerCase())) {
      logStep("VIP user detected - granting lifetime access", { email: user.email });
      return new Response(JSON.stringify({
        status: "active",
        subscribed: true,
        is_new_user: false,
        subscription_end: null, // Lifetime
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check local subscription record first
    const { data: localSub, error: localError } = await supabaseClient
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (localError) {
      logStep("Error fetching local subscription", { error: localError.message });
    }

    // If no local record exists, user is new
    if (!localSub) {
      logStep("No subscription record found - new user");
      return new Response(JSON.stringify({
        status: "none",
        is_new_user: true,
        subscribed: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found local subscription", { status: localSub.status, trial_ends_at: localSub.trial_ends_at });

    // Check if trial has expired
    const now = new Date();
    const trialEndsAt = new Date(localSub.trial_ends_at);
    
    if (localSub.status === "trial" && trialEndsAt < now) {
      // Update status to expired
      await supabaseClient
        .from("user_subscriptions")
        .update({ status: "expired" })
        .eq("id", localSub.id);
      
      logStep("Trial expired, updated status");
      return new Response(JSON.stringify({
        status: "expired",
        trial_ends_at: localSub.trial_ends_at,
        subscribed: false,
        is_new_user: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If user has stripe subscription, verify with Stripe
    if (localSub.stripe_customer_id) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      const subscriptions = await stripe.subscriptions.list({
        customer: localSub.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Update local record if needed
        if (localSub.status !== "active") {
          await supabaseClient
            .from("user_subscriptions")
            .update({ 
              status: "active",
              subscription_id: subscription.id 
            })
            .eq("id", localSub.id);
        }

        logStep("Active Stripe subscription found", { subscriptionId: subscription.id });
        return new Response(JSON.stringify({
          status: "active",
          subscribed: true,
          subscription_end: subscriptionEnd,
          is_new_user: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Calculate days left for trial
    const daysLeft = localSub.status === "trial" 
      ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    logStep("Returning subscription status", { status: localSub.status, daysLeft });
    return new Response(JSON.stringify({
      status: localSub.status,
      trial_ends_at: localSub.trial_ends_at,
      days_left: daysLeft,
      subscribed: localSub.status === "active",
      is_new_user: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
