import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("User not authenticated");
    const user = userData.user;

    // Get seller details
    const { data: sellerDetails, error: sellerError } = await supabaseClient
      .from("seller_details")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (sellerError || !sellerDetails) throw new Error("Seller details not found. Save your details first.");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    let accountId = sellerDetails.stripe_account_id;

    if (accountId) {
      // Update existing connected account
      await stripe.accounts.update(accountId, {
        business_profile: {
          name: sellerDetails.business_name || undefined,
        },
        individual: {
          email: user.email,
          phone: sellerDetails.phone || undefined,
          first_name: sellerDetails.business_name || user.user_metadata?.name || "Seller",
          address: {
            line1: sellerDetails.address_street
              ? `${sellerDetails.address_street}, ${sellerDetails.address_number || ""}`
              : undefined,
            line2: sellerDetails.address_complement || undefined,
            city: sellerDetails.address_city || undefined,
            state: sellerDetails.address_state || undefined,
            postal_code: sellerDetails.address_zip || undefined,
            country: sellerDetails.address_country || "BR",
          },
        },
      });

      console.log(`Updated Stripe Connected Account: ${accountId}`);
    } else {
      // Create new Custom Connected Account
      const account = await stripe.accounts.create({
        type: "custom",
        country: sellerDetails.address_country || "BR",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        business_profile: {
          name: sellerDetails.business_name || undefined,
          mcc: "5945", // Hobby, Toy, and Game Shops
          url: `https://paddock-collectible-hub.lovable.app/seller-store/${user.id}`,
        },
        individual: {
          email: user.email,
          phone: sellerDetails.phone || undefined,
          first_name: sellerDetails.business_name || user.user_metadata?.name || "Seller",
          address: {
            line1: sellerDetails.address_street
              ? `${sellerDetails.address_street}, ${sellerDetails.address_number || ""}`
              : undefined,
            line2: sellerDetails.address_complement || undefined,
            city: sellerDetails.address_city || undefined,
            state: sellerDetails.address_state || undefined,
            postal_code: sellerDetails.address_zip || undefined,
            country: sellerDetails.address_country || "BR",
          },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.headers.get("x-forwarded-for") || "0.0.0.0",
        },
      });

      accountId = account.id;
      console.log(`Created Stripe Connected Account: ${accountId}`);

      // Save stripe_account_id to seller_details
      await supabaseAdmin
        .from("seller_details")
        .update({ stripe_account_id: accountId })
        .eq("user_id", user.id);
    }

    // Create/update external account (bank account) if bank details are provided
    if (sellerDetails.bank_account && sellerDetails.bank_agency) {
      // List existing external accounts to avoid duplicates
      const existingAccounts = await stripe.accounts.listExternalAccounts(accountId, {
        object: "bank_account",
        limit: 10,
      });

      // Remove existing bank accounts first
      for (const existing of existingAccounts.data) {
        try {
          await stripe.accounts.deleteExternalAccount(accountId, existing.id);
        } catch (e) {
          console.warn("Could not remove old bank account:", e);
        }
      }

      // Add new bank account
      await stripe.accounts.createExternalAccount(accountId, {
        external_account: {
          object: "bank_account",
          country: sellerDetails.address_country || "BR",
          currency: "brl",
          routing_number: sellerDetails.bank_agency,
          account_number: sellerDetails.bank_account,
          account_holder_name: sellerDetails.business_name || user.user_metadata?.name || "Seller",
          account_holder_type: "individual",
        },
      });

      console.log(`Bank account linked to Connected Account: ${accountId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        stripe_account_id: accountId,
        message: "Conta Stripe conectada com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Stripe Connect error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
