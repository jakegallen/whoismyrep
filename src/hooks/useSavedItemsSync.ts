/**
 * Cloud sync for saved reps and bills.
 *
 * When a user is authenticated, this hook performs a bidirectional merge
 * between localStorage and the Supabase `saved_items` table.
 *
 * If the table doesn't exist yet (migration not run), the sync
 * silently fails and localStorage continues to work as the source of truth.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const REPS_KEY = "whoismyrep-saved-reps";
const BILLS_KEY = "whoismyrep-saved-bills";
const SYNC_KEY = "whoismyrep-last-sync";

export function useSavedItemsSync() {
  const { user } = useAuth();
  const syncing = useRef(false);

  useEffect(() => {
    if (!user || syncing.current) return;

    // Debounce: don't sync more than once per minute
    const lastSync = localStorage.getItem(SYNC_KEY);
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync).getTime();
      if (elapsed < 60_000) return;
    }

    syncing.current = true;

    (async () => {
      try {
        // 1. Pull cloud saved items
        const { data: cloudItems, error } = await supabase
          .from("saved_items")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          // Table likely doesn't exist — silently bail
          syncing.current = false;
          return;
        }

        // 2. Read local data
        let localReps: any[];
        let localBills: any[];
        try {
          localReps = JSON.parse(localStorage.getItem(REPS_KEY) || "[]");
        } catch {
          localReps = [];
        }
        try {
          localBills = JSON.parse(localStorage.getItem(BILLS_KEY) || "[]");
        } catch {
          localBills = [];
        }

        // 3. Merge cloud → local (items in cloud not yet in local)
        const cloudReps = (cloudItems || [])
          .filter((i: any) => i.item_type === "rep")
          .map((i: any) => i.item_data);
        const cloudBills = (cloudItems || [])
          .filter((i: any) => i.item_type === "bill")
          .map((i: any) => i.item_data);

        const repKeys = new Set(
          localReps.map((r: any) => `${r.name}::${r.office}`.toLowerCase()),
        );
        for (const cr of cloudReps) {
          const key = `${cr.name}::${cr.office}`.toLowerCase();
          if (!repKeys.has(key)) {
            localReps.push(cr);
            repKeys.add(key);
          }
        }

        const billKeys = new Set(localBills.map((b: any) => b.id));
        for (const cb of cloudBills) {
          if (!billKeys.has(cb.id)) {
            localBills.push(cb);
            billKeys.add(cb.id);
          }
        }

        // 4. Persist merged data locally
        try {
          localStorage.setItem(REPS_KEY, JSON.stringify(localReps));
          localStorage.setItem(BILLS_KEY, JSON.stringify(localBills));
        } catch {
          /* quota exceeded */
        }

        // 5. Push local → cloud (items in local not yet in cloud)
        const cloudRepKeys = new Set(
          (cloudItems || [])
            .filter((i: any) => i.item_type === "rep")
            .map((i: any) => i.item_key),
        );
        const cloudBillKeys = new Set(
          (cloudItems || [])
            .filter((i: any) => i.item_type === "bill")
            .map((i: any) => i.item_key),
        );

        const newCloudReps = localReps
          .filter(
            (r: any) =>
              !cloudRepKeys.has(`${r.name}::${r.office}`.toLowerCase()),
          )
          .map((r: any) => ({
            user_id: user.id,
            item_type: "rep" as const,
            item_key: `${r.name}::${r.office}`.toLowerCase(),
            item_data: r,
          }));

        const newCloudBills = localBills
          .filter((b: any) => !cloudBillKeys.has(b.id))
          .map((b: any) => ({
            user_id: user.id,
            item_type: "bill" as const,
            item_key: b.id,
            item_data: b,
          }));

        if (newCloudReps.length > 0) {
          await supabase
            .from("saved_items")
            .upsert(newCloudReps, {
              onConflict: "user_id,item_type,item_key",
            });
        }
        if (newCloudBills.length > 0) {
          await supabase
            .from("saved_items")
            .upsert(newCloudBills, {
              onConflict: "user_id,item_type,item_key",
            });
        }

        // 6. Notify other hooks that localStorage changed
        window.dispatchEvent(new StorageEvent("storage", { key: REPS_KEY }));
        window.dispatchEvent(new StorageEvent("storage", { key: BILLS_KEY }));

        localStorage.setItem(SYNC_KEY, new Date().toISOString());
      } catch {
        // Cloud sync is best-effort — never block the app
      } finally {
        syncing.current = false;
      }
    })();
  }, [user]);
}
