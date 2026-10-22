export const ORDER_BLOCK_MESSAGE = "Você tem pedidos em andamento. Conclua ou cancele antes de excluir a conta.";
export const canConfirmDeletion = (value: string) => value === "EXCLUIR";
export const shouldCancelSubscription = (status: string) => status === "active" || status === "trialing";
export const hasOngoingPaidOrder = (order: { status: string; shipping_status: string | null }) =>
  ["completed", "paid_out", "paid"].includes(order.status) &&
  !["delivered", "completed", "canceled", "cancelled"].includes(order.shipping_status ?? "");