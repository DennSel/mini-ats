import type { OrgRole } from "./types";

export type Caller = {
  role: "admin" | "customer";
  orgRole: OrgRole;
  orgId: string | null;
};

export type CreateInput = {
  role: "admin" | "customer";
  orgRole: OrgRole;
  orgId?: string | undefined;
  newOrgName?: string | undefined;
};

export type Decision =
  | { ok: false; reason: string }
  | {
      ok: true;
      role: "admin" | "customer";
      orgRole: OrgRole;
      orgId: string | null;
      newOrgName?: string | undefined;
    };

export function decideCreateUser(me: Caller | null, input: CreateInput): Decision {
  if (!me) return { ok: false, reason: "Ej inloggad" };
  if (me.role === "admin") {
    if (input.role === "admin") {
      return { ok: true, role: "admin", orgRole: "owner", orgId: null };
    }
    if (!input.orgId && !input.newOrgName) {
      return { ok: false, reason: "Organisation saknas" };
    }
    return {
      ok: true,
      role: "customer",
      orgRole: input.orgRole,
      orgId: input.orgId ?? null,
      newOrgName: input.newOrgName,
    };
  }
  if (me.orgRole !== "owner" || !me.orgId) {
    return { ok: false, reason: "Saknar behörighet" };
  }
  // Customer owners always create customer accounts in their own organisation, ignoring client role/orgId.
  return { ok: true, role: "customer", orgRole: input.orgRole, orgId: me.orgId };
}
