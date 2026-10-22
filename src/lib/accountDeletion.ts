export { canConfirmDeletion } from "../../supabase/functions/delete-account/rules";

export async function clearDeletedAccountData(userId: string) {
  for (const getStorage of [() => localStorage, () => sessionStorage]) {
    try {
    const storage = getStorage();
    for (const key of Object.keys(storage)) {
      if (/^paddock[_-]/.test(key) || key === "push_native_subscribed") {
        if (key === "paddock_onboarding_completed") {
          try {
            const users: unknown = JSON.parse(storage.getItem(key) ?? "[]");
            if (Array.isArray(users)) storage.setItem(key, JSON.stringify(users.filter(id => id !== userId)));
            else storage.removeItem(key);
          } catch { storage.removeItem(key); }
        } else storage.removeItem(key);
      }
    }
    } catch { /* Restricted browser storage must not block sign-out. */ }
  }
  // Clear the persistent photo queue without deleting unrelated browser databases.
  if (typeof indexedDB !== "undefined") {
    await new Promise<void>((resolve) => {
      const open = indexedDB.open("paddock_batch", 1);
      open.onerror = () => resolve();
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains("kv")) { db.close(); resolve(); return; }
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").clear();
        tx.oncomplete = tx.onerror = tx.onabort = () => { db.close(); resolve(); };
      };
    });
  }
}