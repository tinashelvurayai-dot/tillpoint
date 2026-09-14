import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Shape returned to the sign-in screen. Never contains a password. */
type SignInResult = { ok: true; tokenHash: string; name: string } | { ok: false; error: string };

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

/**
 * Cashier sign-in with the two access codes.
 * The codes are checked server-side; a one-time login token is returned so the
 * cashier's real account password never leaves the server.
 */
export const cashierSignIn = createServerFn({ method: "POST" })
  .inputValidator((input: { code1: string; code2: string }) => ({
    code1: normaliseCode(input.code1),
    code2: normaliseCode(input.code2),
  }))
  .handler(async ({ data }): Promise<SignInResult> => {
    if (!data.code1 || !data.code2) return { ok: false, error: "Enter both access codes." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("cashier_accounts")
      .select("id, user_id, name, code2, active, sale_permission")
      .eq("code1", data.code1)
      .maybeSingle();

    if (!row || normaliseCode(row.code2) !== data.code2) {
      return { ok: false, error: "Those access codes are not recognised." };
    }
    if (!row.active) return { ok: false, error: "This cashier account has been switched off." };
    if (!row.user_id) return { ok: false, error: "This cashier account is not set up yet." };

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    const email = userRes?.user?.email;
    if (!email) return { ok: false, error: "This cashier account is not set up yet." };

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (error || !tokenHash) return { ok: false, error: "Could not start the session. Try again." };

    return { ok: true, tokenHash, name: row.name };
  });

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("cashier_accounts")
      .select("id, user_id, name, code1, code2, active, sale_permission, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code1: string; code2: string }) => ({
    name: String(input.name ?? "").trim(),
    code1: normaliseCode(input.code1),
    code2: normaliseCode(input.code2),
  }))
  .handler(async ({ data, context }) => {
    await assertManager(context as never);
    if (!data.name || data.code1.length < 4 || data.code2.length < 4) {
      throw new Error("Enter a name and two access codes of at least 4 characters each.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: clash } = await supabaseAdmin
      .from("cashier_accounts")
      .select("id")
      .eq("code1", data.code1)
      .maybeSingle();
    if (clash) throw new Error("That first access code is already used by another cashier.");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailFor(data.code1),
      password: randomPassword(),
      email_confirm: true,
      user_metadata: { full_name: data.name, cashier_id: data.code1 },
    });
    if (createError || !created?.user) {
      throw new Error(createError?.message ?? "Could not create the cashier account.");
    }

    const { error } = await supabaseAdmin.from("cashier_accounts").insert({
      user_id: created.user.id,
      name: data.name,
      code1: data.code1,
      code2: data.code2,
      active: true,
      sale_permission: true,
    });
    if (error) throw new Error(error.message);

    // Make sure the staff profile and cashier role exist for the new account.
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: created.user.id, full_name: data.name, cashier_id: data.code1, active: true },
        { onConflict: "id" },
      );
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: "cashier" }, { onConflict: "user_id,role" });

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
    }) => ({
      id: String(input.id),
      name: String(input.name ?? "").trim(),
      code1: normaliseCode(input.code1),
      code2: normaliseCode(input.code2),
      active: Boolean(input.active),
      sale_permission: Boolean(input.sale_permission),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertManager(context as never);
    if (!data.name || data.code1.length < 4 || data.code2.length < 4) {
      throw new Error("Enter a name and two access codes of at least 4 characters each.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("cashier_accounts")
      .select("id, user_id, code1")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("That cashier was not found.");

    const { error } = await supabaseAdmin
      .from("cashier_accounts")
      .update({
        name: data.name,
        code1: data.code1,
        code2: data.code2,
        active: data.active,
        sale_permission: data.sale_permission,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (row.user_id) {
      await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
        email: emailFor(data.code1),
        user_metadata: { full_name: data.name, cashier_id: data.code1 },
      });
      await supabaseAdmin
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("cashier_accounts")
      .select("id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };
    await supabaseAdmin.from("cashier_accounts").delete().eq("id", data.id);
    if (row.user_id) {
      await supabaseAdmin.from("profiles").update({ active: false }).eq("id", row.user_id);
      await supabaseAdmin.auth.admin.deleteUser(row.user_id).catch(() => undefined);
    }
    return { ok: true };
  });
