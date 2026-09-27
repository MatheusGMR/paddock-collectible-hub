import { supabase } from "@/integrations/supabase/client";

// New admin tables may not be in generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminDb = supabase as any;

export const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const AUDIENCES = [
  { value: "all", label: "Todos" },
  { value: "collectors", label: "Colecionadores" },
  { value: "sellers", label: "Lojistas" },
  { value: "premium", label: "Assinantes Premium" },
  { value: "trial", label: "Em teste" },
  { value: "inactive", label: "Inativos há X dias" },
  { value: "city", label: "Por cidade" },
  { value: "topic", label: "Por tópico" },
];

export const DESTINATIONS = [
  { value: "/", label: "Início" },
  { value: "/scanner", label: "Scanner" },
  { value: "/mercado", label: "Mercado" },
  { value: "/profile", label: "Perfil" },
  { value: "/notifications", label: "Notificações" },
];
