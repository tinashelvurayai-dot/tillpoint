// Transaction Reset: clears every recorded sale (online and on this device)
// and returns each product variant to its registered peak quantity.
// Products themselves are never deleted.
import { supabase } from "@/integrations/supabase/client";
import { clearLog } from "@/lib/transaction-log";
import { clearQueue } from "@/lib/offline-queue";
import { clearAllDeltas } from "@/lib/local-stock";

export const PEAK_QUANTITY = 40;

export async function runTransactionReset(peak = PEAK_QUANTITY): Promise<void> {
  const { error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  }).rpc("reset_transactions", { p_peak: peak });
  if (error) throw new Error(error.message);

  // Local mirrors: transaction log, offline sale queue and pending stock deltas.
  clearLog();
  clearAllDeltas();
  await clearQueue();
}
