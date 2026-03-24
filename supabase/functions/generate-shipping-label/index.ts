import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCep(cep: string | null) {
  if (!cep) return "";
  const clean = cep.replace(/\D/g, "");
  if (clean.length === 8) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  return clean;
}

function formatPrice(price: number) {
  return price.toFixed(2).replace(".", ",");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sale_id } = await req.json();
    if (!sale_id) throw new Error("sale_id is required");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const userId = authData.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch sale
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("sales")
      .select("*")
      .eq("id", sale_id)
      .single();
    if (saleErr || !sale) throw new Error("Sale not found");

    // Verify seller owns this sale
    if (sale.seller_id !== userId) throw new Error("Access denied");

    // Fetch listing, buyer profile, seller details in parallel
    const [listingRes, buyerRes, sellerRes] = await Promise.all([
      supabaseAdmin.from("listings").select("title, price, currency, image_url").eq("id", sale.listing_id).single(),
      supabaseAdmin.from("profiles").select("username, city, address_street, address_number, address_complement, address_neighborhood, address_state, address_zip, document_number, phone").eq("user_id", sale.buyer_id).single(),
      supabaseAdmin.from("seller_details").select("business_name, document_number, phone, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip").eq("user_id", userId).single(),
    ]);

    const listing = listingRes.data;
    const buyer = buyerRes.data;
    const seller = sellerRes.data;

    if (!listing) throw new Error("Listing not found");

    const buyerName = buyer?.username || "Comprador";
    const buyerAddress = [buyer?.address_street, buyer?.address_number].filter(Boolean).join(", ") || "";
    const buyerComplement = buyer?.address_complement || "";
    const buyerNeighborhood = buyer?.address_neighborhood || "";
    const buyerCity = buyer?.city || "";
    const buyerState = buyer?.address_state || "";
    const buyerZip = formatCep(buyer?.address_zip);
    const buyerDoc = buyer?.document_number || "";

    const sellerName = seller?.business_name || "Vendedor Paddock";
    const sellerAddress = [seller?.address_street, seller?.address_number].filter(Boolean).join(", ") || "";
    const sellerComplement = seller?.address_complement || "";
    const sellerNeighborhood = seller?.address_neighborhood || "";
    const sellerCity = seller?.address_city || "";
    const sellerState = seller?.address_state || "";
    const sellerZip = formatCep(seller?.address_zip);
    const sellerDoc = seller?.document_number || "";

    const trackingCode = sale.tracking_code || "";
    const orderId = sale.id.slice(0, 8).toUpperCase();
    const saleDate = new Date(sale.created_at);
    const dateStr = saleDate.toLocaleDateString("pt-BR");

    // Generate HTML for the label (2 pages: shipping label + declaração)
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 11px; }
  
  .page { page-break-after: always; width: 100%; }
  .page:last-child { page-break-after: auto; }
  
  /* PAGE 1: Shipping Label */
  .label-container {
    border: 2px solid #000;
    padding: 0;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
  }
  .label-header {
    background: #000;
    color: #fff;
    padding: 8px 12px;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    letter-spacing: 3px;
  }
  .label-section {
    padding: 10px 14px;
    border-bottom: 1px solid #000;
  }
  .label-section:last-child { border-bottom: none; }
  .label-title {
    font-size: 9px;
    font-weight: bold;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 4px;
    letter-spacing: 1px;
  }
  .label-name {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 2px;
  }
  .label-address {
    font-size: 11px;
    line-height: 1.5;
  }
  .label-cep {
    font-size: 16px;
    font-weight: bold;
    font-family: monospace;
    margin-top: 4px;
  }
  .tracking-box {
    text-align: center;
    padding: 12px;
    border-bottom: 1px solid #000;
  }
  .tracking-code {
    font-size: 18px;
    font-weight: bold;
    font-family: monospace;
    letter-spacing: 2px;
  }
  .order-id {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
  }
  .receiver-line {
    padding: 8px 14px;
    border-bottom: 1px solid #000;
    font-size: 10px;
  }
  .receiver-line span { color: #999; }
  
  /* PAGE 2: Declaração */
  .decl-container {
    width: 100%;
    border: 1px solid #000;
  }
  .decl-header {
    text-align: center;
    padding: 12px;
    font-size: 16px;
    font-weight: bold;
    border-bottom: 2px solid #000;
    letter-spacing: 2px;
  }
  .decl-tracking {
    text-align: center;
    padding: 6px;
    font-size: 10px;
    border-bottom: 1px solid #000;
  }
  .decl-parties {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .decl-party {
    flex: 1;
    padding: 8px 10px;
    font-size: 10px;
    line-height: 1.6;
  }
  .decl-party:first-child {
    border-right: 1px solid #000;
  }
  .decl-party-title {
    font-weight: bold;
    text-align: center;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .decl-party b { font-size: 9px; }
  
  .decl-items-header {
    text-align: center;
    padding: 6px;
    font-weight: bold;
    font-size: 11px;
    border-bottom: 1px solid #000;
    letter-spacing: 1px;
  }
  .decl-table {
    width: 100%;
    border-collapse: collapse;
  }
  .decl-table th {
    background: #f0f0f0;
    padding: 4px 8px;
    font-size: 9px;
    font-weight: bold;
    text-align: left;
    border: 1px solid #000;
  }
  .decl-table td {
    padding: 4px 8px;
    font-size: 10px;
    border: 1px solid #ccc;
    border-left: 1px solid #000;
    border-right: 1px solid #000;
  }
  .decl-table .total-row td {
    border-top: 2px solid #000;
    font-weight: bold;
    border-bottom: 1px solid #000;
  }
  .decl-footer {
    padding: 10px 14px;
    font-size: 8px;
    line-height: 1.6;
    color: #333;
  }
  .decl-signature {
    text-align: center;
    padding: 20px 14px 10px;
    font-size: 10px;
  }
  .decl-sig-line {
    width: 250px;
    border-top: 1px solid #000;
    margin: 30px auto 4px;
    padding-top: 4px;
  }
  .decl-obs {
    padding: 8px 14px;
    font-size: 7px;
    color: #666;
    border-top: 1px solid #000;
  }
</style>
</head>
<body>

<!-- PAGE 1: Etiqueta de Envio -->
<div class="page">
  <div class="label-container">
    <div class="label-header">PADDOCK</div>
    
    ${trackingCode ? `<div class="tracking-box">
      <div class="tracking-code">${escapeHtml(trackingCode)}</div>
      <div class="order-id">Pedido #${orderId} • ${dateStr}</div>
    </div>` : `<div class="tracking-box">
      <div class="order-id">Pedido #${orderId} • ${dateStr}</div>
    </div>`}
    
    <div class="receiver-line">
      <span>Recebedor:</span> ________________________________________________ 
      <span>Documento:</span> __________________
    </div>
    
    <div class="label-section">
      <div class="label-title">Destinatário</div>
      <div class="label-name">${escapeHtml(buyerName)}</div>
      <div class="label-address">
        ${buyerAddress ? escapeHtml(buyerAddress) : ""}${buyerNeighborhood ? `, ${escapeHtml(buyerNeighborhood)}` : ""}
        ${buyerComplement ? `<br>${escapeHtml(buyerComplement)}` : ""}
      </div>
      ${buyerZip ? `<div class="label-cep">${buyerZip}</div>` : ""}
      <div class="label-address">${[buyerCity, buyerState].filter(Boolean).join(" - ")}</div>
    </div>
    
    <div class="label-section">
      <div class="label-title">Remetente</div>
      <div class="label-name">${escapeHtml(sellerName)}</div>
      <div class="label-address">
        ${sellerAddress ? escapeHtml(sellerAddress) : ""}${sellerNeighborhood ? `, ${escapeHtml(sellerNeighborhood)}` : ""}
        ${sellerComplement ? `<br>${escapeHtml(sellerComplement)}` : ""}
      </div>
      ${sellerZip ? `<div class="label-cep">${sellerZip}</div>` : ""}
      <div class="label-address">${[sellerCity, sellerState].filter(Boolean).join(" - ")}</div>
    </div>
  </div>
</div>

<!-- PAGE 2: Declaração de Conteúdo -->
<div class="page">
  <div class="decl-container">
    <div class="decl-header">DECLARAÇÃO DE CONTEÚDO</div>
    
    ${trackingCode ? `<div class="decl-tracking">Código de rastreamento: <b>${escapeHtml(trackingCode)}</b></div>` : ""}
    
    <div class="decl-parties">
      <div class="decl-party">
        <div class="decl-party-title">REMETENTE</div>
        <b>NOME:</b> ${escapeHtml(sellerName)}<br>
        <b>ENDEREÇO:</b> ${escapeHtml(sellerAddress || "—")}<br>
        <b>CIDADE:</b> ${escapeHtml(sellerCity || "—")} <b>UF:</b> ${escapeHtml(sellerState || "—")}<br>
        <b>CEP:</b> ${sellerZip || "—"} <b>CPF/CNPJ:</b> ${escapeHtml(sellerDoc || "—")}
      </div>
      <div class="decl-party">
        <div class="decl-party-title">DESTINATÁRIO</div>
        <b>NOME:</b> ${escapeHtml(buyerName)}<br>
        <b>ENDEREÇO:</b> ${escapeHtml(buyerAddress || "—")}<br>
        <b>CIDADE:</b> ${escapeHtml(buyerCity || "—")} <b>UF:</b> ${escapeHtml(buyerState || "—")}<br>
        <b>CEP:</b> ${buyerZip || "—"} <b>CPF/CNPJ:</b> ${escapeHtml(buyerDoc || "—")}
      </div>
    </div>
    
    <div class="decl-items-header">IDENTIFICAÇÃO DOS BENS</div>
    
    <table class="decl-table">
      <thead>
        <tr>
          <th style="width:30px">ITEM</th>
          <th>CONTEÚDO</th>
          <th style="width:50px">QUANT.</th>
          <th style="width:80px">VALOR (R$)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>${escapeHtml(listing.title)}</td>
          <td>1</td>
          <td>${formatPrice(sale.sale_price)}</td>
        </tr>
        ${Array.from({ length: 5 }, () => `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`).join("")}
        <tr class="total-row">
          <td colspan="2" style="text-align:right;padding-right:12px"><b>VALOR TOTAL</b></td>
          <td><b>1</b></td>
          <td><b>${formatPrice(sale.sale_price)}</b></td>
        </tr>
      </tbody>
    </table>
    
    <div class="decl-footer">
      <b>D E C L A R A Ç Ã O</b><br><br>
      Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que
      não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem
      no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e
      a quem de direito, por informações inverídicas.<br><br>
      Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo,
      gás ou qualquer outro conteúdo que constitua perigo, conforme o art. 13 da Lei Postal nº 6.538/78.
    </div>
    
    <div class="decl-signature">
      <div class="decl-sig-line">Assinatura do Declarante/Remetente</div>
    </div>
    
    <div class="decl-obs">
      <b>OBSERVAÇÃO:</b> Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social e qualquer acessório (Lei 8.137/90 Art. 1º, V).
    </div>
  </div>
</div>

</body>
</html>`;

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-shipping-label error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
