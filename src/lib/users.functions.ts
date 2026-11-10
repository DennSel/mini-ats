import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  decideCreateUser,
  decideDeleteUser,
  decideUpdateUser,
  type Caller,
  type TargetUser,
} from "./create-user-rules";
import { supabaseUrl as defaultSupabaseUrl } from "./supabase";
import type { OrgRole, Role } from "./types";

function getServiceClient() {
  const supabaseUrl =
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
    process.env["VITE_SUPABASE_URL"] ||
    defaultSupabaseUrl;
  // Lovable reserves the SUPABASE_ prefix, so the key is stored as SB_SERVICE_ROLE_KEY there.
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SB_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Serverkonfiguration saknas (SUPABASE_SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveCaller(
  sb: ReturnType<typeof getServiceClient>,
  accessToken: string,
): Promise<(Caller & { id: string }) | null> {
  const { data: auth, error: authErr } = await sb.auth.getUser(accessToken);
  if (authErr || !auth.user) {
    throw new Error("Ej inloggad");
  }

  const { data: p } = await sb
    .from("profiles")
    .select("role, org_role, org_id")
    .eq("id", auth.user.id)
    .single();

  const profile = p as { role: Role; org_role: OrgRole; org_id: string | null } | null;
  if (!profile) return null;
  return {
    id: auth.user.id,
    role: profile.role,
    orgRole: profile.org_role,
    orgId: profile.org_id,
  };
}

async function countOrgOwners(
  sb: ReturnType<typeof getServiceClient>,
  orgId: string | null,
): Promise<number> {
  if (!orgId) return 0;
  const { count } = await sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "customer")
    .eq("org_id", orgId)
    .eq("org_role", "owner");
  return count ?? 0;
}

async function validateOrgJobIds(
  sb: ReturnType<typeof getServiceClient>,
  orgId: string | null,
  jobIds: string[] | null | undefined,
): Promise<string[] | null> {
  if (jobIds === null || jobIds === undefined) return null;
  const uniqueIds = Array.from(new Set(jobIds));
  if (uniqueIds.length === 0) return [];
  if (!orgId) {
    throw new Error("Tjänsterna tillhör inte organisationen");
  }
  const { data: validJobs, error } = await sb
    .from("jobs")
    .select("id")
    .eq("org_id", orgId)
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);
  if ((validJobs ?? []).length !== uniqueIds.length) {
    throw new Error("Tjänsterna tillhör inte organisationen");
  }
  return uniqueIds;
}

const createUserInputSchema = z.object({
  accessToken: z.string().min(1),
  email: z.string().trim().email(),
  fullName: z.string().trim().min(1),
  password: z.string().min(8),
  orgRole: z.enum(["owner", "member", "viewer"]),
  role: z.enum(["admin", "customer"]).default("customer"),
  orgId: z.string().uuid().optional(),
  newOrgName: z.string().trim().min(1).optional(),
  jobIds: z.array(z.string().uuid()).nullable().optional(),
});

export const createUser = createServerFn({ method: "POST" })
  .validator(createUserInputSchema)
  .handler(async ({ data }) => {
    const sb = getServiceClient();
    const me = await resolveCaller(sb, data.accessToken);

    const d = decideCreateUser(me, {
      role: data.role,
      orgRole: data.orgRole,
      orgId: data.orgId,
      newOrgName: data.newOrgName,
      jobIds: data.jobIds,
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

    const effectiveOrgId = d.role === "admin" ? null : orgId;
    const verifiedJobIds = await validateOrgJobIds(sb, effectiveOrgId, d.jobIds);

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
      org_id: effectiveOrgId,
      full_name: data.fullName,
      email: data.email,
      job_ids: verifiedJobIds,
    });

    if (e2) {
      await sb.auth.admin.deleteUser(created.user.id);
      if (createdOrgId) await sb.from("orgs").delete().eq("id", createdOrgId);
      throw new Error(e2.message);
    }

    return { id: created.user.id, orgId };
  });

const updateUserInputSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(["admin", "customer"]).optional(),
  orgRole: z.enum(["owner", "member", "viewer"]).optional(),
  orgId: z.string().uuid().nullable().optional(),
  jobIds: z.array(z.string().uuid()).nullable().optional(),
});

export const updateUser = createServerFn({ method: "POST" })
  .validator(updateUserInputSchema)
  .handler(async ({ data }) => {
    const sb = getServiceClient();
    const me = await resolveCaller(sb, data.accessToken);

    const { data: targetRow } = await sb
      .from("profiles")
      .select("id, full_name, email, role, org_role, org_id, job_ids")
      .eq("id", data.userId)
      .single();

    if (!targetRow) {
      throw new Error("Användaren hittades inte");
    }

    const row = targetRow as {
      id: string;
      full_name: string;
      email: string;
      role: Role;
      org_role: OrgRole;
      org_id: string | null;
      job_ids: string[] | null;
    };

    const target: TargetUser = {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      orgRole: row.org_role,
      orgId: row.org_id,
      jobIds: row.job_ids,
    };

    const ownerCount = await countOrgOwners(sb, target.orgId);
    const d = decideUpdateUser(
      me,
      target,
      {
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        orgRole: data.orgRole,
        orgId: data.orgId,
        jobIds: data.jobIds,
      },
      ownerCount,
    );

    if (!d.ok) {
      throw new Error(d.reason);
    }

    const verifiedJobIds = await validateOrgJobIds(sb, d.orgId, d.jobIds);

    if (d.email !== target.email) {
      const { error: authUpdateErr } = await sb.auth.admin.updateUserById(target.id, {
        email: d.email,
        email_confirm: true,
      });
      if (authUpdateErr) throw new Error(authUpdateErr.message);
    }

    const { error: profileErr } = await sb
      .from("profiles")
      .update({
        full_name: d.fullName,
        email: d.email,
        role: d.role,
        org_role: d.orgRole,
        org_id: d.orgId,
        job_ids: verifiedJobIds,
      })
      .eq("id", target.id);

    if (profileErr) {
      throw new Error(profileErr.message);
    }

    return { id: target.id };
  });

const deleteUserInputSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
});

export const deleteUser = createServerFn({ method: "POST" })
  .validator(deleteUserInputSchema)
  .handler(async ({ data }) => {
    const sb = getServiceClient();
    const me = await resolveCaller(sb, data.accessToken);

    const { data: targetRow } = await sb
      .from("profiles")
      .select("id, role, org_role, org_id")
      .eq("id", data.userId)
      .single();

    if (!targetRow) {
      throw new Error("Användaren hittades inte");
    }

    const row = targetRow as {
      id: string;
      role: Role;
      org_role: OrgRole;
      org_id: string | null;
    };

    const ownerCount = await countOrgOwners(sb, row.org_id);
    const d = decideDeleteUser(
      me,
      {
        id: row.id,
        role: row.role,
        orgRole: row.org_role,
        orgId: row.org_id,
      },
      ownerCount,
    );

    if (!d.ok) {
      throw new Error(d.reason);
    }

    const { error: delErr } = await sb.auth.admin.deleteUser(row.id);
    if (delErr) {
      throw new Error(delErr.message);
    }

    return { id: row.id };
  });

const deleteOrgInputSchema = z.object({
  accessToken: z.string().min(1),
  orgId: z.string().uuid(),
});

export const deleteOrg = createServerFn({ method: "POST" })
  .validator(deleteOrgInputSchema)
  .handler(async ({ data }) => {
    const sb = getServiceClient();
    const me = await resolveCaller(sb, data.accessToken);
    if (!me || me.role !== "admin") {
      throw new Error("Endast administratörer kan ta bort organisationer");
    }

    const { data: orgProfiles, error: fetchErr } = await sb
      .from("profiles")
      .select("id")
      .eq("org_id", data.orgId);
    if (fetchErr) throw new Error(fetchErr.message);

    if (orgProfiles && orgProfiles.length > 0) {
      for (const p of orgProfiles) {
        if (p.id !== me.id) {
          const { error: delErr } = await sb.auth.admin.deleteUser(p.id);
          if (delErr) throw new Error(delErr.message);
        }
      }
    }

    // Remove stored CVs before the organisation row (and its candidates) go away.
    // Tolerate a missing resume_path column so deletion still works before the
    // resume migration has run in a project.
    const { data: orgCandidates, error: candErr } = await sb
      .from("candidates")
      .select("resume_path")
      .eq("org_id", data.orgId);
    if (candErr) {
      if (!candErr.message.includes("resume_path")) throw new Error(candErr.message);
    } else {
      const resumePaths = (orgCandidates ?? [])
        .map((c: { resume_path: string | null }) => c.resume_path)
        .filter((p): p is string => !!p);
      if (resumePaths.length > 0) {
        const { error: removeErr } = await sb.storage.from("resumes").remove(resumePaths);
        if (removeErr) throw new Error(removeErr.message);
      }
    }

    const { error: orgDelErr } = await sb.from("orgs").delete().eq("id", data.orgId);
    if (orgDelErr) throw new Error(orgDelErr.message);

    return { id: data.orgId };
  });
