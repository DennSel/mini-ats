import type { Candidate, Job, Organization, User } from "./types";

export const DEMO_NORDVIK_ID = "11111111-1111-1111-1111-111111111111";
export const DEMO_SOLBERG_ID = "22222222-2222-2222-2222-222222222222";

export const DEMO_USERS: Record<"owner" | "admin", User> = {
  owner: {
    id: "u-demo-owner",
    name: "Anna Lindberg",
    email: "anna.lindberg@nordvik.se",
    role: "customer",
    orgRole: "owner",
    orgId: DEMO_NORDVIK_ID,
  },
  admin: {
    id: "u-demo-admin",
    name: "Karin Holmberg",
    email: "admin@kandsys.se",
    role: "admin",
    orgRole: "owner",
    orgId: null,
  },
};

export const DEMO_TEAM_MEMBERS: User[] = [
  DEMO_USERS.owner,
  {
    id: "u-demo-member",
    name: "Erik Berg",
    email: "erik.berg@nordvik.se",
    role: "customer",
    orgRole: "member",
    orgId: DEMO_NORDVIK_ID,
  },
  {
    id: "u-demo-viewer",
    name: "Mikael Ek",
    email: "mikael.ek@nordvik.se",
    role: "customer",
    orgRole: "viewer",
    orgId: DEMO_NORDVIK_ID,
  },
  DEMO_USERS.admin,
];

export const INITIAL_DEMO_ORGS: Organization[] = [
  {
    id: DEMO_NORDVIK_ID,
    name: "Nordvik Tech AB",
  },
  {
    id: DEMO_SOLBERG_ID,
    name: "Solberg Logistik",
  },
];

export const INITIAL_DEMO_JOBS: Job[] = [
  {
    id: "job-demo-1",
    orgId: DEMO_NORDVIK_ID,
    title: "Senior Frontendutvecklare",
    location: "Stockholm",
    description: "Bygg vårt nya kundgränssnitt i React och TypeScript.",
    status: "open",
    createdAt: "2026-09-14",
  },
  {
    id: "job-demo-2",
    orgId: DEMO_NORDVIK_ID,
    title: "UX-designer",
    location: "Göteborg (hybrid)",
    description: "Forma användarupplevelsen i våra produkter.",
    status: "open",
    createdAt: "2026-09-28",
  },
  {
    id: "job-demo-3",
    orgId: DEMO_NORDVIK_ID,
    title: "DevOps-ingenjör",
    location: "Distans",
    description: "Ansvara för vår molninfrastruktur och CI/CD.",
    status: "closed",
    createdAt: "2026-07-02",
  },
  {
    id: "job-demo-4",
    orgId: DEMO_SOLBERG_ID,
    title: "Lagerchef",
    location: "Jönköping",
    description: "Led ett team på 25 personer i vårt centrallager.",
    status: "open",
    createdAt: "2026-10-01",
  },
  {
    id: "job-demo-5",
    orgId: DEMO_SOLBERG_ID,
    title: "Transportplanerare",
    location: "Malmö",
    description: "Planera och optimera våra leveransrutter.",
    status: "open",
    createdAt: "2026-10-12",
  },
];

export const INITIAL_DEMO_CANDIDATES: Candidate[] = [
  {
    id: "c-demo-1",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-1",
    name: "Sara Ekström",
    email: "sara.ekstrom@gmail.com",
    phone: "070-100 10 20",
    linkedin: "https://www.linkedin.com/in/sara-ekstrom",
    links: [{ id: "l-demo-1", label: "GitHub", url: "https://github.com/sara-ekstrom" }],
    note: "Stark profil inom React 19 och moderna designsystem.",
    resumePath: "demo:sara-ekstrom.pdf",
    stage: "new",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-01",
  },
  {
    id: "c-demo-2",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-2",
    name: "Johan Berg",
    email: "johan.berg@gmail.com",
    phone: "071-137 17 23",
    linkedin: "https://www.linkedin.com/in/johan-berg",
    links: [],
    note: "Gedigen portfölj inom B2B SaaS.",
    resumePath: null,
    stage: "new",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-04",
  },
  {
    id: "c-demo-3",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-1",
    name: "Lina Nyström",
    email: "lina.nystrom@gmail.com",
    phone: "072-174 24 26",
    linkedin: "https://www.linkedin.com/in/lina-nystrom",
    links: [],
    note: "Har tidigare byggt och lett migrering till TanStack Router.",
    resumePath: null,
    stage: "screening",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-07",
  },
  {
    id: "c-demo-4",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-1",
    name: "Ahmed Karimi",
    email: "ahmed.karimi@gmail.com",
    phone: "070-211 31 29",
    linkedin: "https://www.linkedin.com/in/ahmed-karimi",
    links: [{ id: "l-demo-4", label: "GitHub", url: "https://github.com/ahmed-karimi" }],
    note: "Teknisk telefonavstämning genomförd, går vidare.",
    resumePath: null,
    stage: "screening",
    position: 2000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-10",
  },
  {
    id: "c-demo-5",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-2",
    name: "Maja Persson",
    email: "maja.persson@gmail.com",
    phone: "071-248 38 32",
    linkedin: "https://www.linkedin.com/in/maja-persson",
    links: [],
    note: "Case-presentation bokad.",
    interviewAt: "2026-11-18T13:30",
    interviewLink: "https://meet.google.com/abc-defg-hij",
    resumePath: null,
    stage: "interview",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-13",
  },
  {
    id: "c-demo-6",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-1",
    name: "Oskar Lund",
    email: "oskar.lund@gmail.com",
    phone: "072-285 45 35",
    linkedin: "https://www.linkedin.com/in/oskar-lund",
    links: [],
    note: "Första tekniska intervjun genomförd med teamet.",
    interviewAt: "2026-11-20T10:00",
    interviewLink: "https://meet.google.com/xyz-uvwx-rst",
    resumePath: null,
    stage: "interview",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-16",
  },
  {
    id: "c-demo-7",
    orgId: DEMO_NORDVIK_ID,
    jobId: "job-demo-1",
    name: "Elin Sjöberg",
    email: "elin.sjoberg@gmail.com",
    phone: "070-322 52 38",
    linkedin: "https://www.linkedin.com/in/elin-sjoberg",
    links: [{ id: "l-demo-7", label: "GitHub", url: "https://github.com/elin-sjoberg" }],
    note: "Referenser tagna, avtalsförslag skickat.",
    resumePath: null,
    stage: "offer",
    position: 1000,
    createdBy: "u-demo-owner",
    createdAt: "2026-10-19",
  },
];

// Ephemeral in-memory store for files uploaded during demo session
const demoBlobStore = new Map<string, Blob>();

function createMinimalPdfBlob(title: string): Blob {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 100>>stream
BT
/F1 16 Tf
72 710 Td
(${title}) Tj
/F1 12 Tf
0 -30 Td
(Detta ar ett exempeldokument genererat for KandSys demolage.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000052 00000 n 
0000000108 00000 n 
0000000222 00000 n 
0000000293 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
445
%%EOF`;
  return new Blob([content], { type: "application/pdf" });
}

export function getDemoResumeBlob(path: string): Blob {
  const existing = demoBlobStore.get(path);
  if (existing) return existing;
  const sample = createMinimalPdfBlob("Demoprofil: CV (PDF)");
  demoBlobStore.set(path, sample);
  return sample;
}

export function storeDemoResume(file: File): string {
  const path = `demo:${Date.now()}-${file.name}`;
  demoBlobStore.set(path, file);
  return path;
}

export function removeDemoResume(path: string): void {
  demoBlobStore.delete(path);
}

const DEMO_LOGIN_ENABLED_KEY = "kandsys_demo_login_enabled";

export function getStoredDemoLoginEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const val = window.localStorage.getItem(DEMO_LOGIN_ENABLED_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

export function setStoredDemoLoginEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_LOGIN_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}
