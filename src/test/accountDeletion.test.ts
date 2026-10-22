import { describe, expect, it } from "vitest";
import { canConfirmDeletion, hasOngoingPaidOrder, shouldCancelSubscription, ORDER_BLOCK_MESSAGE } from "../../supabase/functions/delete-account/rules";
import { clearDeletedAccountData } from "../lib/accountDeletion";

describe("exclusão de conta", () => {
  it("exige digitar exatamente EXCLUIR", () => {
    expect(canConfirmDeletion("EXCLUIR")).toBe(true);
    for (const value of ["", "excluir", " EXCLUIR", "EXCLUIR "]) expect(canConfirmDeletion(value)).toBe(false);
  });
  it("bloqueia pedidos pagos ainda não entregues/concluídos", () => {
    for (const status of ["completed", "paid_out", "paid"]) {
      expect(hasOngoingPaidOrder({ status, shipping_status: "in_transit" })).toBe(true);
      expect(hasOngoingPaidOrder({ status, shipping_status: null })).toBe(true);
      for (const shipping_status of ["delivered", "completed", "canceled", "cancelled"]) expect(hasOngoingPaidOrder({ status, shipping_status })).toBe(false);
    }
    expect(hasOngoingPaidOrder({ status: "pending", shipping_status: "confirmed" })).toBe(false);
    expect(ORDER_BLOCK_MESSAGE).toBe("Você tem pedidos em andamento. Conclua ou cancele antes de excluir a conta.");
  });
  it("cancela assinaturas Stripe ativas e em teste", () => {
    expect(shouldCancelSubscription("active")).toBe(true);
    expect(shouldCancelSubscription("trialing")).toBe(true);
    expect(shouldCancelSubscription("canceled")).toBe(false);
  });
  it("limpa biometria e onboarding somente do usuário excluído", async () => {
    localStorage.clear();
    localStorage.setItem("paddock_stored_email", "teste@example.com");
    localStorage.setItem("paddock_biometric_enabled", "true");
    localStorage.setItem("paddock_onboarding_completed", JSON.stringify(["deleted", "other"]));
    localStorage.setItem("unrelated", "preserved");
    await clearDeletedAccountData("deleted");
    expect(localStorage.getItem("paddock_stored_email")).toBeNull();
    expect(localStorage.getItem("paddock_biometric_enabled")).toBeNull();
    expect(JSON.parse(localStorage.getItem("paddock_onboarding_completed") ?? "null")).toEqual(["other"]);
    expect(localStorage.getItem("unrelated")).toBe("preserved");
  });
});