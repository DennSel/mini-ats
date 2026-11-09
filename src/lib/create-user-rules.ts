import type { OrgRole } from "./types";

export type Caller = {
  id?: string | undefined;
  role: "admin" | "customer";
  orgRole: OrgRole;
  orgId: string | null;
};

export type CreateInput = {
  role: "admin" | "customer";
  orgRole: OrgRole;
  orgId?: string | undefined;
  newOrgName?: string | undefined;
  jobIds?: string[] | null | undefined;
};

export type Decision =
  | { ok: false; reason: string }
  | {
      ok: true;
      role: "admin" | "customer";
      orgRole: OrgRole;
      orgId: string | null;
      newOrgName?: string | undefined;
      jobIds?: string[] | null | undefined;
    };

export function decideCreateUser(me: Caller | null, input: CreateInput): Decision {
  if (!me) return { ok: false, reason: "Ej inloggad" };
  if (me.role === "admin") {
    if (input.role === "admin") {
      return {
        ok: true,
        role: "admin",
        orgRole: "owner",
        orgId: null,
        ...(input.jobIds !== undefined ? { jobIds: null } : {}),
      };
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
      ...(input.jobIds !== undefined
        ? { jobIds: input.orgRole === "owner" ? null : input.jobIds }
        : {}),
    };
  }
  if (me.orgRole !== "owner" || !me.orgId) {
    return { ok: false, reason: "Saknar behörighet" };
  }
  // Customer owners always create customer accounts in their own organisation, ignoring client role/orgId.
  return {
    ok: true,
    role: "customer",
    orgRole: input.orgRole,
    orgId: me.orgId,
    ...(input.jobIds !== undefined
      ? { jobIds: input.orgRole === "owner" ? null : input.jobIds }
      : {}),
  };
}

export type TargetUser = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "customer";
  orgRole: OrgRole;
  orgId: string | null;
  jobIds?: string[] | null | undefined;
};

export type UpdateInput = {
  fullName?: string | undefined;
  email?: string | undefined;
  role?: "admin" | "customer" | undefined;
  orgRole?: OrgRole | undefined;
  orgId?: string | null | undefined;
  jobIds?: string[] | null | undefined;
};

export type UpdateDecision =
  | { ok: false; reason: string }
  | {
      ok: true;
      fullName: string;
      email: string;
      role: "admin" | "customer";
      orgRole: OrgRole;
      orgId: string | null;
      jobIds?: string[] | null | undefined;
    };

export function decideUpdateUser(
  me: Caller | null,
  target: TargetUser,
  patch: UpdateInput,
  ownerCountInTargetOrg: number,
): UpdateDecision {
  if (!me) return { ok: false, reason: "Ej inloggad" };

  if (me.role === "admin") {
    const nextRole = patch.role ?? target.role;
    const nextOrgRole: OrgRole = nextRole === "admin" ? "owner" : (patch.orgRole ?? target.orgRole);
    const nextOrgId =
      nextRole === "admin" ? null : patch.orgId !== undefined ? patch.orgId : target.orgId;

    if (nextRole === "customer" && !nextOrgId) {
      return { ok: false, reason: "Organisation saknas" };
    }

    const losesOwnerInTargetOrg =
      target.role === "customer" &&
      target.orgRole === "owner" &&
      (nextRole !== "customer" || nextOrgRole !== "owner" || nextOrgId !== target.orgId);

    if (losesOwnerInTargetOrg && ownerCountInTargetOrg <= 1) {
      return { ok: false, reason: "Organisationen måste ha minst en ägare" };
    }

    const hasJobIds = patch.jobIds !== undefined || target.jobIds !== undefined;
    const nextJobIds =
      nextRole === "admin" || nextOrgRole === "owner"
        ? null
        : nextOrgId !== target.orgId
          ? (patch.jobIds ?? null)
          : patch.jobIds !== undefined
            ? patch.jobIds
            : (target.jobIds ?? null);

    return {
      ok: true,
      fullName: patch.fullName ?? target.fullName,
      email: patch.email ?? target.email,
      role: nextRole,
      orgRole: nextOrgRole,
      orgId: nextOrgId,
      ...(hasJobIds || nextOrgId !== target.orgId ? { jobIds: nextJobIds } : {}),
    };
  }

  // Customer caller: must be an owner in the same organisation as the target customer user.
  if (
    me.orgRole !== "owner" ||
    !me.orgId ||
    target.role !== "customer" ||
    target.orgId !== me.orgId
  ) {
    return { ok: false, reason: "Saknar behörighet" };
  }

  // Customers cannot edit profile details (name/email) or promote to admin / move across orgs.
  if (
    patch.fullName !== undefined ||
    patch.email !== undefined ||
    (patch.role !== undefined && patch.role !== "customer") ||
    (patch.orgId !== undefined && patch.orgId !== me.orgId)
  ) {
    return { ok: false, reason: "Saknar behörighet" };
  }

  const nextOrgRole = patch.orgRole ?? target.orgRole;
  if (target.orgRole === "owner" && nextOrgRole !== "owner" && ownerCountInTargetOrg <= 1) {
    return { ok: false, reason: "Organisationen måste ha minst en ägare" };
  }

  const hasJobIds = patch.jobIds !== undefined || target.jobIds !== undefined;
  const nextJobIds =
    nextOrgRole === "owner"
      ? null
      : patch.jobIds !== undefined
        ? patch.jobIds
        : (target.jobIds ?? null);

  return {
    ok: true,
    fullName: target.fullName,
    email: target.email,
    role: "customer",
    orgRole: nextOrgRole,
    orgId: me.orgId,
    ...(hasJobIds ? { jobIds: nextJobIds } : {}),
  };
}

export type DeleteDecision = { ok: false; reason: string } | { ok: true };

export function decideDeleteUser(
  me: (Caller & { id: string }) | null,
  target: Pick<TargetUser, "id" | "role" | "orgRole" | "orgId">,
  ownerCountInTargetOrg: number,
): DeleteDecision {
  if (!me) return { ok: false, reason: "Ej inloggad" };

  if (me.role !== "admin") {
    if (
      me.orgRole !== "owner" ||
      !me.orgId ||
      target.role !== "customer" ||
      target.orgId !== me.orgId
    ) {
      return { ok: false, reason: "Saknar behörighet" };
    }
  }

  if (me.id === target.id) {
    return { ok: false, reason: "Du kan inte ta bort dig själv" };
  }

  if (
    me.role !== "admin" &&
    target.role === "customer" &&
    target.orgRole === "owner" &&
    ownerCountInTargetOrg <= 1
  ) {
    return { ok: false, reason: "Organisationen måste ha minst en ägare" };
  }

  return { ok: true };
}
