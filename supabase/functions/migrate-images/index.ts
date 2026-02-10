import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all collection items with base64 image_url
    const { data: items, error } = await supabase
      .from("user_collection")
      .select("id, user_id, image_url")
      .not("image_url", "is", null);

    if (error) throw error;

    const base64Items = (items || []).filter(
      (item) => item.image_url && item.image_url.startsWith("data:")
    );

    console.log(`Found ${base64Items.length} base64 images to migrate`);

    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of base64Items) {
      try {
        const base64String = item.image_url!;
        
        // Extract mime type and data
        const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          errors.push(`${item.id}: invalid base64 format`);
          failed++;
          continue;
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Check if data is too small (corrupt)
        if (base64Data.length < 100) {
          errors.push(`${item.id}: base64 data too small (${base64Data.length} chars), likely corrupt`);
          failed++;
          continue;
        }

        // Decode base64 to Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Determine file extension
        const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
        const filePath = `${item.user_id}/${item.id}.${ext}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("collection-images")
          .upload(filePath, bytes, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          errors.push(`${item.id}: upload failed - ${uploadError.message}`);
          failed++;
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("collection-images")
          .getPublicUrl(filePath);

        // Update the record
        const { error: updateError } = await supabase
          .from("user_collection")
          .update({ image_url: urlData.publicUrl })
          .eq("id", item.id);

        if (updateError) {
          errors.push(`${item.id}: update failed - ${updateError.message}`);
          failed++;
          continue;
        }

        migrated++;
        console.log(`Migrated ${item.id} -> ${filePath}`);
      } catch (e) {
        errors.push(`${item.id}: ${e.message}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        total: base64Items.length,
        migrated,
        failed,
        errors: errors.slice(0, 20),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
