import { supabase } from "./supabase";
import type {
  Candidate,
  CandidateLink,
  Job,
  JobStatus,
  OrgRole,
  Organization,
  Role,
  Stage,
  User,
} from "./types";

export const POSITION_STEP = 1000;
export const MIN_POSITION_GAP = 0.000001;

export const positionBetween = (prev?: number, next?: number): number =>
  prev == null && next == null
    ? POSITION_STEP
    : prev == null
      ? next! - POSITION_STEP
      : next == null
        ? prev + POSITION_STEP
        : (prev + next) / 2;

export const needsRenumbering = (prev?: number, next?: number): boolean =>
  prev != null && next != null && Math.abs(next - prev) < MIN_POSITION_GAP;

export interface PlannedMove {
  id: string;
  stage: Stage;
  position: number;
  renumbered: { id: string; stage: Stage; position: number }[] | null;
}

export function planMoveCandidate(
  candidates: Candidate[],
  id: string,
  stage: Stage,
  beforeId?: string | null,
): PlannedMove | null {
  const item = candidates.find((c) => c.id === id);
  if (!item) return null;

  const col = candidates
    .filter((c) => c.orgId === item.orgId && c.id !== id && c.stage === stage)
    .sort((a, b) => a.position - b.position);

  let idx = beforeId ? col.findIndex((c) => c.id === beforeId) : col.length;
  if (idx === -1) idx = col.length;

  const prev = idx > 0 ? col[idx - 1]?.position : undefined;
  const next = idx < col.length ? col[idx]?.position : undefined;
  const position = positionBetween(prev, next);

  if (needsRenumbering(prev, next)) {
    const updatedCol = [...col.slice(0, idx), { ...item, stage, position }, ...col.slice(idx)];
    const renumbered = updatedCol.map((c, i) => ({
      id: c.id,
      stage,
      position: (i + 1) * POSITION_STEP,
    }));
    return {
      id,
      stage,
      position: (idx + 1) * POSITION_STEP,
      renumbered,
    };
  }

  return { id, stage, position, renumbered: null };
}

export interface OrgRow {
  id: string;
  name: string;
  created_at?: string;
}

export interface ProfileRow {
  id: string;
  role: Role;
  org_role: OrgRole;
  org_id: string | null;
  full_name: string;
  email: string;
  job_ids?: string[] | null;
}

export interface JobRow {
  id: string;
  org_id: string;
  title: string;
  location: string;
  description: string;
  status: JobStatus;
  created_at: string;
}

export interface CandidateRow {
  id: string;
  org_id: string;
  job_id: string | null;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  note: string;
  links: CandidateLink[] | null;
  interview_at: string | null;
  interview_link: string | null;
  stage: Stage;
  position: number;
  created_by?: string | null;
  created_at: string;
}

export const toOrganization = (r: OrgRow): Organization => ({
  id: r.id,
  name: r.name,
});

export const toUser = (r: ProfileRow): User => ({
  id: r.id,
  name: r.full_name,
  email: r.email,
  role: r.role,
  orgRole: r.org_role,
  orgId: r.org_id,
  ...(r.job_ids ? { jobIds: r.job_ids } : {}),
});

export const toJob = (r: JobRow): Job => ({
  id: r.id,
  orgId: r.org_id,
  title: r.title,
  location: r.location,
  description: r.description,
  status: r.status,
  createdAt: String(r.created_at).slice(0, 10),
});

export const toCandidate = (r: CandidateRow): Candidate => ({
  id: r.id,
  orgId: r.org_id,
  jobId: r.job_id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  linkedin: r.linkedin,
  note: r.note,
  links: Array.isArray(r.links) ? r.links : [],
  interviewAt: r.interview_at ? String(r.interview_at).slice(0, 16) : undefined,
  interviewLink: r.interview_link ?? undefined,
  stage: r.stage,
  position: r.position,
  createdAt: String(r.created_at).slice(0, 10),
  createdBy: r.created_by ?? undefined,
});

export interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          opts?: { ascending?: boolean },
        ) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
}

export async function fetchJobs(
  orgId: string,
  client: SupabaseLike = supabase as unknown as SupabaseLike,
): Promise<Job[]> {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JobRow[]).map(toJob);
}

export async function fetchCandidates(
  orgId: string,
  client: SupabaseLike = supabase as unknown as SupabaseLike,
): Promise<Candidate[]> {
  const { data, error } = await client
    .from("candidates")
    .select("*")
    .eq("org_id", orgId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as CandidateRow[]).map(toCandidate);
}
