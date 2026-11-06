import type { Candidate, Job, OrgRole, Stage, User } from "./mock-data";

export type Permission =
  | "moveCandidates" // drag on the pipeline, change stage, write notes, book interview
  | "manageCandidates" // create, edit, delete candidates, links and job assignment
  | "manageJobs" // create, edit, open/close jobs
  | "manageTeam"; // invite/remove colleagues and set their roles

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: ["moveCandidates", "manageCandidates", "manageJobs", "manageTeam"],
  recruiter: ["moveCandidates", "manageCandidates", "manageJobs"],
  reviewer: ["moveCandidates"],
  viewer: [],
};

/** Platform admins can do everything; customers follow their organisation role. */
export function can(user: User | null | undefined, perm: Permission) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return ROLE_PERMISSIONS[user.orgRole].includes(perm);
}

/** Owners and admins see every job; others only the jobs the owner gave them (all if unset). */
export function canSeeJob(user: User | null | undefined, jobId: string) {
  if (!user) return false;
  if (user.role === "admin" || user.orgRole === "owner" || !user.jobIds) return true;
  return user.jobIds.includes(jobId);
}

export function visibleJobs(user: User | null | undefined, jobs: Job[], orgId: string | null) {
  return jobs.filter((j) => j.orgId === orgId && canSeeJob(user, j.id));
}

/** Dormant candidates are visible to everyone in the org; others follow job access. */
export function visibleCandidates(
  user: User | null | undefined,
  candidates: Candidate[],
  orgId: string | null,
) {
  return candidates.filter(
    (c) => c.orgId === orgId && (c.jobId === null || canSeeJob(user, c.jobId)),
  );
}

/** An organisation must always keep at least one owner. */
export function isLastOwner(users: User[], userId: string) {
  const u = users.find((x) => x.id === userId);
  if (!u || u.role !== "customer" || u.orgRole !== "owner") return false;
  return (
    users.filter((x) => x.orgId === u.orgId && x.role === "customer" && x.orgRole === "owner")
      .length === 1
  );
}

/** Send a candidate to another job (or to the dormant pool with null); restarts at "Ny". */
export function assignCandidate(
  candidates: Candidate[],
  id: string,
  jobId: string | null,
): Candidate[] {
  const c = candidates.find((x) => x.id === id);
  if (!c || c.jobId === jobId) return candidates;
  return [...candidates.filter((x) => x.id !== id), { ...c, jobId, stage: "new" }];
}

export function canAccessAdmin(user: User | null | undefined) {
  return user?.role === "admin";
}

export function homePathFor(user: User | null | undefined) {
  if (!user) return "/login" as const;
  return user.role === "admin" ? ("/admin" as const) : ("/board" as const);
}

/** Organisation whose data the user currently sees. */
export function activeOrgFor(user: User | null | undefined, selectedOrgId: string | null) {
  if (!user) return null;
  return user.role === "admin" ? selectedOrgId : user.orgId;
}

export function filterCandidates(
  candidates: Candidate[],
  opts: { orgId: string | null; jobId?: string; q?: string; assignedOnly?: boolean },
) {
  const q = (opts.q ?? "").trim().toLowerCase();
  return candidates.filter(
    (c) =>
      c.orgId === opts.orgId &&
      (!opts.assignedOnly || c.jobId !== null) &&
      (!opts.jobId || c.jobId === opts.jobId) &&
      (!q || c.name.toLowerCase().includes(q)),
  );
}

/**
 * Move a candidate to a stage, optionally placing it before another candidate.
 * Array order is the in-column order.
 */
export function moveCandidate(
  candidates: Candidate[],
  id: string,
  stage: Stage,
  beforeId?: string | null,
): Candidate[] {
  const item = candidates.find((c) => c.id === id);
  if (!item) return candidates;
  const rest = candidates.filter((c) => c.id !== id);
  const moved = { ...item, stage };
  let index = beforeId ? rest.findIndex((c) => c.id === beforeId) : -1;
  if (index === -1) {
    // place after the last candidate in the target stage
    let last = -1;
    rest.forEach((c, i) => {
      if (c.stage === stage) last = i;
    });
    index = last + 1;
    if (last === -1) index = rest.length;
  }
  rest.splice(index, 0, moved);
  return rest;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
