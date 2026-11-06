export type Role = "admin" | "customer";
/** Role inside a customer organisation. */
export type OrgRole = "owner" | "recruiter" | "reviewer" | "viewer";

export const ORG_ROLES: { id: OrgRole; label: string; description: string }[] = [
  {
    id: "owner",
    label: "Ägare",
    description: "Allt, inkl. bjuda in/ta bort medarbetare och styra jobbåtkomst",
  },
  {
    id: "recruiter",
    label: "Rekryterare",
    description: "Skapa/redigera jobb och kandidater, flytta och anteckna",
  },
  {
    id: "reviewer",
    label: "Bedömare",
    description: "Flytta kandidater mellan steg och skriva anteckningar",
  },
  { id: "viewer", label: "Läsare", description: "Se jobb och kandidater" },
];

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
  password: string;
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
  interviewAt?: string;
  interviewLink?: string;
  stage: Stage;
  createdAt: string;
}

export const STAGES: { id: Stage; label: string }[] = [
  { id: "new", label: "Ny" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Intervju" },
  { id: "offer", label: "Erbjudande" },
  { id: "hired", label: "Anställd" },
  { id: "rejected", label: "Avslag" },
];

export const seedOrganizations: Organization[] = [
  { id: "org-nordvik", name: "Nordvik Tech AB" },
  { id: "org-solberg", name: "Solberg Logistik" },
];

export const seedUsers: User[] = [
  {
    id: "u-admin",
    name: "Dennis Sandberg",
    email: "admin@kandsys.se",
    password: "admin123",
    role: "admin",
    orgRole: "owner",
    orgId: null,
  },
  {
    id: "u-anna",
    name: "Anna Lindqvist",
    email: "anna@nordvik.se",
    password: "kund123",
    role: "customer",
    orgRole: "owner",
    orgId: "org-nordvik",
  },
  {
    id: "u-lars",
    name: "Lars Ek",
    email: "lars@nordvik.se",
    password: "kund123",
    role: "customer",
    orgRole: "recruiter",
    orgId: "org-nordvik",
  },
  {
    id: "u-mia",
    name: "Mia Holm",
    email: "mia@nordvik.se",
    password: "kund123",
    role: "customer",
    orgRole: "viewer",
    orgId: "org-nordvik",
  },
  {
    id: "u-erik",
    name: "Erik Holm",
    email: "erik@solberg.se",
    password: "kund123",
    role: "customer",
    orgRole: "owner",
    orgId: "org-solberg",
  },
];

export const seedJobs: Job[] = [
  {
    id: "job-n1",
    orgId: "org-nordvik",
    title: "Senior Frontendutvecklare",
    location: "Stockholm",
    description: "Bygg vårt nya kundgränssnitt i React och TypeScript.",
    status: "open",
    createdAt: "2026-09-14",
  },
  {
    id: "job-n2",
    orgId: "org-nordvik",
    title: "UX-designer",
    location: "Göteborg (hybrid)",
    description: "Forma användarupplevelsen i våra produkter.",
    status: "open",
    createdAt: "2026-09-28",
  },
  {
    id: "job-n3",
    orgId: "org-nordvik",
    title: "DevOps-ingenjör",
    location: "Distans",
    description: "Ansvara för vår molninfrastruktur och CI/CD.",
    status: "closed",
    createdAt: "2026-07-02",
  },
  {
    id: "job-s1",
    orgId: "org-solberg",
    title: "Lagerchef",
    location: "Jönköping",
    description: "Led ett team på 25 personer i vårt centrallager.",
    status: "open",
    createdAt: "2026-10-01",
  },
  {
    id: "job-s2",
    orgId: "org-solberg",
    title: "Transportplanerare",
    location: "Malmö",
    description: "Planera och optimera våra leveransrutter.",
    status: "open",
    createdAt: "2026-10-12",
  },
  {
    id: "job-s3",
    orgId: "org-solberg",
    title: "Ekonomiassistent",
    location: "Jönköping",
    description: "Stötta ekonomiavdelningen med löpande bokföring.",
    status: "closed",
    createdAt: "2026-06-20",
  },
];

const nordvikNames = [
  "Sara Ekström",
  "Johan Berg",
  "Lina Nyström",
  "Ahmed Karimi",
  "Maja Persson",
  "Oskar Lund",
  "Elin Sjöberg",
  "Viktor Åkesson",
  "Nora Hedlund",
  "Filip Strand",
  "Amira Haddad",
  "Gustav Wallin",
  "Tove Rask",
  "Samir Jabari",
];

const solbergNames = [
  "Karin Dahl",
  "Mikael Olsson",
  "Fatima Yilmaz",
  "Henrik Björk",
  "Emma Lindgren",
  "Daniel Forsberg",
  "Julia Sandström",
  "Ali Hassan",
  "Ida Nordin",
  "Patrik Engström",
  "Sofia Isaksson",
  "Marcus Lindahl",
  "Hanna Krook",
];

const stageCycle: Stage[] = [
  "new",
  "new",
  "screening",
  "screening",
  "interview",
  "interview",
  "offer",
  "hired",
  "rejected",
  "new",
  "screening",
  "interview",
];

function slug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildCandidates(orgId: string, names: string[], jobIds: string[], domain: string) {
  return names.map<Candidate>((name, i) => {
    // the last names (beyond 12) are saved, dormant candidates
    const dormant = i >= 12;
    const s = slug(name);
    const day = String(((i * 3) % 27) + 1).padStart(2, "0");
    return {
      id: `cand-${orgId}-${i + 1}`,
      orgId,
      jobId: dormant ? null : jobIds[i % jobIds.length]!,
      name,
      email: `${s.replace("-", ".")}@${domain}`,
      phone: `07${(i % 3) + 0}-${String(100 + i * 37).padStart(3, "0")} ${String(10 + i * 7).padStart(2, "0")} ${String(20 + i * 3).padStart(2, "0")}`,
      linkedin: `https://www.linkedin.com/in/${s}`,
      links:
        i % 4 === 0
          ? [{ id: `l-${orgId}-${i}`, label: "GitHub", url: `https://github.com/${s}` }]
          : [],
      note: "",
      stage: dormant ? "new" : stageCycle[i % stageCycle.length]!,
      createdAt: `2026-10-${day}`,
    };
  });
}

export const seedCandidates: Candidate[] = [
  ...buildCandidates("org-nordvik", nordvikNames, ["job-n1", "job-n2", "job-n3"], "gmail.com"),
  ...buildCandidates("org-solberg", solbergNames, ["job-s1", "job-s2", "job-s3"], "outlook.com"),
];
