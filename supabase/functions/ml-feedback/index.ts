import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FeedbackPayload {
  type: "like" | "error";
  item_id?: string;
  variant_id?: string;
  
  // For error reports
  error_field?: string;
  original_value?: string;
  corrected_value?: string;
  visual_cues?: string;
  
  // Original data for context
  original_brand?: string;
  original_model?: string;
  original_manufacturer?: string;
  original_scale?: string;
  original_year?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload: FeedbackPayload = await req.json();
    
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let uid: string | null = null;
    const auth = req.headers.get("authorization");
    if (auth) {
      try {
        uid = (await sb.auth.getUser(auth.replace("Bearer ", ""))).data.user?.id || null;
      } catch {}
    }

    // =====================================================
    // 1. Record in scan_feedback table (existing)
    // =====================================================
    await sb.from("scan_feedback").insert({
      user_id: uid,
      item_id: payload.item_id || null,
      feedback_type: payload.type === "like" ? "like" : "report",
      error_field: payload.error_field || null,
      original_value: payload.original_value || null,
      error_correction: payload.corrected_value || null,
    });

    // =====================================================
    // 2. Update A/B test result if variant_id provided
    // =====================================================
    if (payload.variant_id) {
      // Find and update the most recent A/B result for this variant
      const { data: abResults } = await sb
        .from("ml_ab_results")
        .select("id")
        .eq("variant_id", payload.variant_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (abResults && abResults.length > 0) {
        await sb
          .from("ml_ab_results")
          .update({
            was_successful: payload.type === "like",
            error_field: payload.error_field || null,
          })
          .eq("id", abResults[0].id);

        // Update variant metrics
        if (payload.type === "like") {
          await sb.rpc("record_ab_result", {
            p_variant_id: payload.variant_id,
            p_was_successful: true,
          });
        } else {
          await sb.rpc("record_ab_result", {
            p_variant_id: payload.variant_id,
            p_was_successful: false,
            p_error_field: payload.error_field,
          });
        }
      }
    }

    // =====================================================
    // 3. Add correction to ML system (for errors only)
    // =====================================================
    if (payload.type === "error" && payload.error_field && payload.corrected_value) {
      // Build correction data based on error field
      const correctionData: Record<string, unknown> = {
        corrected_field: payload.error_field,
        visual_cues: payload.visual_cues || null,
      };

      // Set original and corrected values based on field
      if (payload.error_field === "manufacturer") {
        correctionData.original_manufacturer = payload.original_value;
        correctionData.corrected_manufacturer = payload.corrected_value;
        correctionData.original_brand = payload.original_brand;
        correctionData.original_model = payload.original_model;
      } else if (payload.error_field === "brand") {
        correctionData.original_brand = payload.original_value;
        correctionData.corrected_brand = payload.corrected_value;
      } else if (payload.error_field === "model") {
        correctionData.original_model = payload.original_value;
        correctionData.corrected_model = payload.corrected_value;
        correctionData.original_brand = payload.original_brand;
      } else if (payload.error_field === "scale") {
        correctionData.original_scale = payload.original_value;
        correctionData.corrected_scale = payload.corrected_value;
      } else if (payload.error_field === "year") {
        correctionData.original_year = payload.original_value;
        correctionData.corrected_year = payload.corrected_value;
      }

      // Check if similar correction already exists
      const { data: existing } = await sb
        .from("ml_corrections")
        .select("id, validation_count")
        .eq("corrected_field", payload.error_field)
        .eq("original_" + payload.error_field, payload.original_value)
        .eq("corrected_" + payload.error_field, payload.corrected_value)
        .limit(1);

      if (existing && existing.length > 0) {
        // Increment validation count (more users confirming = more reliable)
        await sb
          .from("ml_corrections")
          .update({ validation_count: existing[0].validation_count + 1 })
          .eq("id", existing[0].id);
      } else {
        // Insert new correction
        await sb.from("ml_corrections").insert(correctionData);
      }

      // =====================================================
      // 4. Detect patterns from repeated errors
      // =====================================================
      await detectAndLearnPatterns(sb, payload.error_field, payload.original_value, payload.corrected_value);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Feedback recorded" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// deno-lint-ignore no-explicit-any
async function detectAndLearnPatterns(sb: any, field: string, originalValue: string, correctedValue: string) {
  // Count how many times this specific error has occurred
  const { data: errorCount } = await sb
    .from("scan_feedback")
    .select("id", { count: "exact" })
    .eq("feedback_type", "report")
    .eq("error_field", field)
    .eq("original_value", originalValue);

  const count = errorCount?.length || 0;

  // If error occurred 3+ times, create or update a learned pattern
  if (count >= 3) {
    const patternType = `${field}_confusion`;
    const triggerCondition = `"${originalValue}" frequentemente confundido`;
    const correctionPrompt = `ATENÇÃO: Quando identificar "${originalValue}", verifique cuidadosamente - usuários frequentemente corrigem para "${correctedValue}".`;

    // Check if pattern exists
    const { data: existingPattern } = await sb
      .from("ml_learned_patterns")
      .select("id, occurrence_count, examples")
      .eq("pattern_type", patternType)
      .ilike("trigger_condition", `%${originalValue}%`)
      .limit(1);

    if (existingPattern && existingPattern.length > 0) {
      // Update existing pattern
      const newExamples = existingPattern[0].examples || [];
      if (!newExamples.some((e: { original: string }) => e.original === originalValue)) {
        newExamples.push({ original: originalValue, corrected: correctedValue });
      }

      await sb
        .from("ml_learned_patterns")
        .update({
          occurrence_count: existingPattern[0].occurrence_count + 1,
          last_occurrence: new Date().toISOString(),
          examples: newExamples,
          effectiveness_score: Math.min(0.9, (existingPattern[0].occurrence_count + 1) / 10),
        })
        .eq("id", existingPattern[0].id);
    } else {
      // Create new pattern
      await sb.from("ml_learned_patterns").insert({
        pattern_type: patternType,
        trigger_condition: triggerCondition,
        correction_prompt: correctionPrompt,
        examples: [{ original: originalValue, corrected: correctedValue }],
        occurrence_count: count,
        effectiveness_score: 0.5,
      });
    }
  }
}
