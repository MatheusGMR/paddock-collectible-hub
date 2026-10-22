import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { z } from "npm:zod@3";
import { hasOngoingPaidOrder, shouldCancelSubscription, ORDER_BLOCK_MESSAGE } from "./rules.ts";
import { deleteOwnAccount } from "./workflow.ts";

const bodySchema = z.object({ confirmation: z.literal("EXCLUIR") }).strict();
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405);
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({ error: "Entre na sua conta para continuar." }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!url || !anon || !serviceKey || !stripeKey) return reply({ error: "Não foi possível excluir sua conta. Tente novamente mais tarde." }, 503);
  const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const token = authorization.slice(7);
  const { data: claims, error: claimError } = await auth.auth.getClaims(token);
  if (claimError || !claims?.claims.sub) return reply({ error: "Entre novamente na sua conta para continuar." }, 401);
  // Fetching the user also rejects a still-unexpired JWT from an already deleted account.
  const { data: identity, error: identityError } = await auth.auth.getUser(token);
  if (identityError || !identity.user || identity.user.id !== claims.claims.sub) return reply({ error: "Entre novamente na sua conta para continuar." }, 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Digite EXCLUIR para confirmar a exclusão." }, 400);
  const userId = identity.user.id;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  try {
    await deleteOwnAccount({
      hasPendingOrders: async () => {
        // Check actual sales, not an editable seller profile flag.
        const { data, error } = await admin.from("sales").select("status,shipping_status").eq("seller_id", userId).in("status", ["completed", "paid_out", "paid"]);
        if (error) throw error;
        return (data ?? []).some(hasOngoingPaidOrder);
      },
      cancelSubscriptions: async () => {
        const { data: subscriptions, error } = await admin.from("user_subscriptions").select("stripe_customer_id,subscription_id").eq("user_id", userId);
        if (error) throw error;
        const customers = new Set<string>();
        const subscriptionIds = new Set<string>();
        for (const row of subscriptions ?? []) {
          if (row.stripe_customer_id) customers.add(row.stripe_customer_id);
          if (row.subscription_id) subscriptionIds.add(row.subscription_id);
        }
        // The existing checkout can create a Stripe customer before persisting the local ID.
        if (identity.user.email) {
          for await (const customer of stripe.customers.list({ email: identity.user.email, limit: 100 })) customers.add(customer.id);
        }
        for (const customer of customers) {
          for await (const subscription of stripe.subscriptions.list({ customer, status: "all", limit: 100 })) {
            if (shouldCancelSubscription(subscription.status)) subscriptionIds.add(subscription.id);
          }
        }
        for (const id of subscriptionIds) {
          const subscription = await stripe.subscriptions.retrieve(id);
          if (shouldCancelSubscription(subscription.status)) await stripe.subscriptions.cancel(id);
        }
      },
      removeFiles: async () => {
        // Read ownership through a service-only function; delete bytes exclusively via Storage API.
        // Repeat because the Data API caps result pages; never leave files beyond the first page.
        while (true) {
        const { data, error } = await admin.rpc("account_deletion_files", { p_user_id: userId });
        if (error) throw error;
        if (!data?.length) break;
        const buckets = new Map<string, string[]>();
        for (const file of data ?? []) {
          const paths = buckets.get(file.bucket_id) ?? [];
          paths.push(file.name);
          buckets.set(file.bucket_id, paths);
        }
        for (const [bucket, paths] of buckets) {
          for (let start = 0; start < paths.length; start += 100) {
            const { error: storageError } = await admin.storage.from(bucket).remove(paths.slice(start, start + 100));
            if (storageError) throw storageError;
          }
        }
        }
      },
      removeData: async () => {
        // Transactional cleanup rechecks the paid-order guard and handles all non-cascading IDs.
        const { error } = await admin.rpc("delete_account_data", { p_user_id: userId });
        if (error) throw error;
      },
      removeAuth: async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
      },
    });
    return reply({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
    if (message.includes(ORDER_BLOCK_MESSAGE)) return reply({ error: ORDER_BLOCK_MESSAGE }, 409);
    // Never expose billing, storage details or credentials in the response/logs.
    console.error("[delete-account] Account deletion did not complete.");
    return reply({ error: "Não foi possível concluir a exclusão da sua conta. Tente novamente." }, 500);
  }
});