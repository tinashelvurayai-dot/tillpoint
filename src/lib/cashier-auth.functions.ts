import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normaliseCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function emailFor(code1: string): string {
  return `${code1.toLowerCase().replace(/[^a-z0-9]/g, "")}@exo-till.local`;
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `${btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "")}xQ7!`;
}

async function assertManager(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "manager",
  });
  if (!data) throw new Error("Only the manager can do this.");
}

export const listCashiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManager(context as never);
    const { data, error } = await context.supabase
      .from("cashier_accounts")
      .select("id, user_id, name, code1, code2, active, sale_permission, photo_url, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code1: string; code2: string; photo_url?: string | null }) => ({
    name: String(input.name ?? "").trim(),
    code1: normaliseCode(input.code1),
    code2: normaliseCode(input.code2),
    photo_url: input.photo_url ? String(input.photo_url) : null,
  }))
  .handler(async ({ data, context }) => {
    await assertManager(context as never);
    if (!data.name || data.code1.length < 4 || data.code2.length < 4) {
      throw new Error("Enter a name and two access codes of at least 4 characters each.");
    }

    const { data: clash } = await context.supabase
      .from("cashier_accounts")
      .select("id")
      .eq("code1", data.code1)
      .maybeSingle();
    if (clash) throw new Error("That first access code is already used by another cashier.");

    const { error } = await context.supabase.from("cashier_accounts").insert({
      name: data.name,
      code1: data.code1,
      code2: data.code2,
      active: true,
      sale_permission: true,
      photo_url: data.photo_url,
      login_email: emailFor(data.code1),
      login_password: randomPassword(),
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const updateCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      name: string;
      code1: string;
      code2: string;
      active: boolean;
      sale_permission?: boolean;
      photo_url?: string | null;
    }) => ({
      id: String(input.id),
      name: String(input.name ?? "").trim(),
      code1: normaliseCode(input.code1),
      code2: normaliseCode(input.code2),
      active: Boolean(input.active),
      sale_permission: Boolean(input.sale_permission),
      photo_url: input.photo_url ? String(input.photo_url) : null,
    }),
  )
  .handler(async ({ data, context }) => {
    await assertManager(context as never);
    if (!data.name || data.code1.length < 4 || data.code2.length < 4) {
      throw new Error("Enter a name and two access codes of at least 4 characters each.");
    }

    const { data: row } = await context.supabase
      .from("cashier_accounts")
      .select("id, user_id, code1, login_password")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("That cashier was not found.");

    const codeChanged = normaliseCode(row.code1) !== data.code1;

    const { error } = await context.supabase
      .from("cashier_accounts")
      .update({
        name: data.name,
        code1: data.code1,
        code2: data.code2,
        active: data.active,
        sale_permission: data.sale_permission,
        photo_url: data.photo_url,
        login_email: emailFor(data.code1),
        login_password: codeChanged ? randomPassword() : (row.login_password ?? randomPassword()),
        ...(codeChanged ? { user_id: null } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row.user_id && !codeChanged) {
      await context.supabase
        .from("profiles")
        .update({ full_name: data.name, cashier_id: data.code1, active: data.active })
        .eq("id", row.user_id);
    }
    return { ok: true };
  });

export const deleteCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id) }))
  .handler(async ({ data, context }) => {
    await assertManager(context as never);
    const { data: row } = await context.supabase
      .from("cashier_accounts")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };

    await context.supabase.from("cashier_accounts").delete().eq("id", data.id);
    if (row.user_id) {
      // The staff profile is switched off so the old login can no longer be used.
      await context.supabase.from("profiles").update({ active: false }).eq("id", row.user_id);
    }
    return { ok: true };
  });
