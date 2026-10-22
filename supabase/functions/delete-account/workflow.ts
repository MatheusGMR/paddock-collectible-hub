import { ORDER_BLOCK_MESSAGE } from "./rules.ts";

export async function deleteOwnAccount(steps: {
  hasPendingOrders: () => Promise<boolean>;
  cancelSubscriptions: () => Promise<void>;
  removeFiles: () => Promise<void>;
  removeData: () => Promise<void>;
  removeAuth: () => Promise<void>;
}) {
  // Refuse before making ANY destructive change, including cancelling billing.
  if (await steps.hasPendingOrders()) throw new Error(ORDER_BLOCK_MESSAGE);
  await steps.cancelSubscriptions();
  await steps.removeFiles();
  await steps.removeData();
  await steps.removeAuth();
}