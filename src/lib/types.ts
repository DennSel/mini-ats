export type Role = "admin" | "customer";
/** Role inside a customer organisation. */
export type OrgRole = "owner" | "member" | "viewer";

export const ORG_ROLES = [
  { id: "owner", label: "Ägare", description: "Hanterar teamet och allt annat" },
  { id: "member", label: "Medlem", description: "Jobb, kandidater och flytt" },
  { id: "viewer", label: "Läsare", description: "Kan bara läsa" },
] as const;

export interface CandidateLink {
  id: string;
  label: string;
  url: string;
}
export type JobStatus = "open" | "closed";
export type Stage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgRole: OrgRole;
  orgId: string | null;
  /** Jobs this member may see. undefined = all jobs in the organisation. Owners always see all. */
  jobIds?: string[] | undefined;
}

export interface Job {
  id: string;
  orgId: string;
  title: string;
  location: string;
  description: string;
  status: JobStatus;
  createdAt: string;
}

export interface Candidate {
  id: string;
  orgId: string;
  /** null = dormant (saved, not attached to any job) */
  jobId: string | null;
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  links: CandidateLink[];
  note: string;
  /** Interview time as "YYYY-MM-DDTHH:mm", empty when not booked */
  interviewAt?: string | undefined;
  interviewLink?: string | undefined;
  stage: Stage;
  position: number;
  createdAt: string;
  /** User id of the member who added the candidate */
  createdBy?: string | undefined;
}

export const STAGES: { id: Stage; label: string }[] = [
  { id: "new", label: "Ny" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Intervju" },
  { id: "offer", label: "Erbjudande" },
  { id: "hired", label: "Anställd" },
  { id: "rejected", label: "Avslag" },
];
