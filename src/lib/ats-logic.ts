import type { Candidate, Job, OrgRole, Stage, User } from "./mock-data";

export type Permission =
  | "moveCandidates" // drag on the pipeline, change stage, write notes, book interview
  | "manageCandidates" // create, edit, delete candidates, links and job assignment
  | "manageJobs" // create, edit, open/close jobs
  | "manageTeam"; // invite/remove colleagues and set their roles

const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: ["moveCandidates", "manageCandidates", "manageJobs", "manageTeam"],
  member: ["moveCandidates", "manageCandidates", "manageJobs"],
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

export type InterviewUrgency = "past" | "soon" | "week" | "later";

/** soon = within 2 days, week = within 7 days, later = further away, past = already passed */
export function interviewUrgency(at: string, now: Date = new Date()): InterviewUrgency {
  const diff = new Date(at).getTime() - now.getTime();
  const day = 86_400_000;
  if (diff < 0) return "past";
  if (diff <= 2 * day) return "soon";
  if (diff <= 7 * day) return "week";
  return "later";
}

/**
 * Returns relative days string (e.g. "idag", "1 dag", "8 dagar") if within one month in the future.
 * Returns null if the date has passed or is further away than one month.
 */
export function interviewRelativeDays(at: string, now: Date = new Date()): string | null {
  const target = new Date(at);
  if (Number.isNaN(target.getTime())) return null;

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneMonthAhead = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();

  if (targetDay >= today && targetDay <= oneMonthAhead) {
    const diffDays = Math.round((targetDay - today) / 86_400_000);
    return diffDays === 0 ? "idag" : diffDays === 1 ? "1 dag" : `${diffDays} dagar`;
  }
  return null;
}

/**
 * Format interview timestamp, e.g. "2026-11-18 kl. 11:53 (8 dagar)".
 * Appends relative days if the date is in the future and within one month.
 */
export function formatInterviewTime(at: string, now: Date = new Date()): string {
  const base = at.slice(0, 16).replace("T", " kl. ");
  const rel = interviewRelativeDays(at, now);
  return rel ? `${base} (${rel})` : base;
}

/**
 * Format ISO timestamp to date string "YYYY-MM-DD".
 */
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
