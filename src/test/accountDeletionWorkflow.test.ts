import { describe, expect, it, vi } from "vitest";
import { deleteOwnAccount } from "../../supabase/functions/delete-account/workflow";

describe("exclusão permanente no servidor", () => {
  it("não cancela assinatura nem apaga dados de lojista com pedido em andamento", async () => {
    const steps = { hasPendingOrders: vi.fn().mockResolvedValue(true), cancelSubscriptions: vi.fn(), removeFiles: vi.fn(), removeData: vi.fn(), removeAuth: vi.fn() };
    await expect(deleteOwnAccount(steps)).rejects.toThrow("Você tem pedidos em andamento. Conclua ou cancele antes de excluir a conta.");
    for (const action of [steps.cancelSubscriptions, steps.removeFiles, steps.removeData, steps.removeAuth]) expect(action).not.toHaveBeenCalled();
  });
  it("cancela cobrança e remove arquivos, dados e acesso nessa ordem", async () => {
    const calls: string[] = [];
    await deleteOwnAccount({ hasPendingOrders: async () => false, cancelSubscriptions: async () => { calls.push("stripe"); }, removeFiles: async () => { calls.push("storage"); }, removeData: async () => { calls.push("data"); }, removeAuth: async () => { calls.push("auth"); } });
    expect(calls).toEqual(["stripe", "storage", "data", "auth"]);
  });
  it("não exclui acesso se a remoção dos arquivos falhar", async () => {
    const removeAuth = vi.fn();
    const removeData = vi.fn();
    await expect(deleteOwnAccount({ hasPendingOrders: async () => false, cancelSubscriptions: async () => {}, removeFiles: async () => { throw new Error("falha"); }, removeData, removeAuth })).rejects.toThrow("falha");
    expect(removeAuth).not.toHaveBeenCalled();
    expect(removeData).not.toHaveBeenCalled();
  });
});