import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { decideCreateUser } from "./create-user-rules";
import { supabaseUrl as defaultSupabaseUrl } from "./supabase";
import type { OrgRole, Role } from "./types";

const createUserInputSchema = z.object({
  accessToken: z.string().min(1),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  password: z.string().min(8),
  orgRole: z.enum(["owner", "member", "viewer"]),
  role: z.enum(["admin", "customer"]).default("customer"),
  orgId: z.string().uuid().optional(),
  newOrgName: z.string().trim().min(1).optional(),
});

export const createUser = createServerFn({ method: "POST" })
  .validator(createUserInputSchema)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env["VITE_SB_URL"] || defaultSupabaseUrl;
    // Check SB_SERVICE_ROLE_KEY first because Lovable Cloud injects its own internal SUPABASE_SERVICE_ROLE_KEY.
    const serviceRoleKey =
      process.env["SB_SERVICE_ROLE_KEY"] || process.env["SUPABASE_SERVICE_ROLE_KEY"];

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Serverkonfiguration saknas (SUPABASE_SERVICE_ROLE_KEY)");
    }

    const sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: auth, error: authErr } = await sb.auth.getUser(data.accessToken);
    if (authErr || !auth.user) {
      throw new Error("Ej inloggad");
    }

    const { data: p } = await sb
      .from("profiles")
      .select("role, org_role, org_id")
      .eq("id", auth.user.id)
      .single();

    const profile = p as { role: Role; org_role: OrgRole; org_id: string | null } | null;
    const me = profile
      ? { role: profile.role, orgRole: profile.org_role, orgId: profile.org_id }
      : null;

    const d = decideCreateUser(me, {
      role: data.role,
      orgRole: data.orgRole,
      orgId: data.orgId,
      newOrgName: data.newOrgName,
    });
    if (!d.ok) {
      throw new Error(d.reason);
    }

    let orgId = d.orgId;
    let createdOrgId: string | null = null;
    if (d.newOrgName) {
      const { data: o, error: orgErr } = await sb
        .from("orgs")
        .insert({ name: d.newOrgName })
        .select("id")
        .single();
      if (orgErr) throw new Error(orgErr.message);
      orgId = (o as { id: string }).id;
      createdOrgId = orgId;
    }

    const { data: created, error: e1 } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (e1 || !created.user) {
      if (createdOrgId) await sb.from("orgs").delete().eq("id", createdOrgId);
      throw new Error(e1?.message ?? "Kunde inte skapa konto");
    }

    const { error: e2 } = await sb.from("profiles").insert({
      id: created.user.id,
      role: d.role,
      org_role: d.orgRole,
      org_id: d.role === "admin" ? null : orgId,
      full_name: data.fullName,
      email: data.email,
    });

    if (e2) {
      await sb.auth.admin.deleteUser(created.user.id);
      if (createdOrgId) await sb.from("orgs").delete().eq("id", createdOrgId);
      throw new Error(e2.message);
    }

    return { id: created.user.id, orgId };
  });
