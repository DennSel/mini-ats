import { describe, expect, it } from "vitest";
import {
  activeOrgFor,
  assignCandidate,
  can,
  canAccessAdmin,
  isLastOwner,
  filterCandidates,
  homePathFor,
  interviewUrgency,
  interviewRelativeDays,
  formatInterviewTime,
  formatDate,
  moveCandidate,
} from "@/lib/ats-logic";
import type { Candidate, User } from "@/lib/types";

const testUsers: User[] = [
  {
    id: "u-admin",
    name: "Maja Lindqvist",
    email: "admin@kandsys.se",
    role: "admin",
    orgRole: "owner",
    orgId: null,
  },
  {
    id: "u-anna",
    name: "Anna Berg",
    email: "anna@nordvik.se",
    role: "customer",
    orgRole: "owner",
    orgId: "org-nordvik",
  },
  {
    id: "u-lars",
    name: "Lars Holm",
    email: "lars@nordvik.se",
    role: "customer",
    orgRole: "member",
    orgId: "org-nordvik",
  },
];

const testCandidates: Candidate[] = [
  {
    id: "cand-1",
    orgId: "org-nordvik",
    jobId: "job-n1",
    name: "Erik Sjöberg",
    email: "erik@example.com",
    phone: "070-111 22 33",
    linkedin: "https://www.linkedin.com/in/erik-sjoberg",
    links: [],
    note: "",
    stage: "interview",
    position: 1000,
    createdAt: "2026-10-12",
  },
  {
    id: "cand-2",
    orgId: "org-nordvik",
    jobId: null,
    name: "Klara Nyström",
    email: "klara@example.com",
    phone: "070-222 33 44",
    linkedin: "",
    links: [],
    note: "",
    stage: "new",
    position: 2000,
    createdAt: "2026-10-14",
  },
  {
    id: "cand-3",
    orgId: "org-solberg",
    jobId: "job-s1",
    name: "Oskar Lind",
    email: "oskar@example.com",
    phone: "",
    linkedin: "",
    links: [],
    note: "",
    stage: "new",
    position: 1000,
    createdAt: "2026-10-15",
  },
];

const admin = testUsers[0]!;
const customer = testUsers[1]!;

describe("ats rules", () => {
  it("only admins can access /admin", () => {
    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessAdmin(customer)).toBe(false);
  });

  it("admin lands on /admin, customer on /board", () => {
    expect(homePathFor(admin)).toBe("/admin");
    expect(homePathFor(customer)).toBe("/board");
  });

  it("customer always sees own org, admin sees selected org", () => {
    expect(activeOrgFor(customer, "org-solberg")).toBe("org-nordvik");
    expect(activeOrgFor(admin, "org-solberg")).toBe("org-solberg");
  });

  it("filters candidates by org", () => {
    const res = filterCandidates(testCandidates, { orgId: "org-nordvik" });
    expect(res).toHaveLength(2);
    expect(res.every((c) => c.orgId === "org-nordvik")).toBe(true);
  });

  it("moves a candidate to a new stage", () => {
    const id = testCandidates[0]!.id;
    const res = moveCandidate(testCandidates, id, "hired");
    expect(res.find((c) => c.id === id)?.stage).toBe("hired");
    expect(res).toHaveLength(testCandidates.length);
  });

  it("pipeline hides dormant candidates", () => {
    const res = filterCandidates(testCandidates, { orgId: "org-nordvik", assignedOnly: true });
    expect(res).toHaveLength(1);
    expect(res[0]?.id).toBe("cand-1");
  });

  it("role permissions", () => {
    const as = (orgRole: User["orgRole"]) => ({ ...customer, orgRole });
    expect(can(as("owner"), "manageTeam")).toBe(true);
    expect(can(as("member"), "manageJobs")).toBe(true);
    expect(can(as("member"), "manageCandidates")).toBe(true);
    expect(can(as("member"), "moveCandidates")).toBe(true);
    expect(can(as("member"), "manageTeam")).toBe(false);
    expect(can(as("viewer"), "moveCandidates")).toBe(false);
    expect(can(as("viewer"), "manageJobs")).toBe(false);
    expect(can(admin, "manageTeam")).toBe(true);
  });

  it("last owner of an org is protected", () => {
    expect(isLastOwner(testUsers, "u-anna")).toBe(true);
    expect(isLastOwner(testUsers, "u-lars")).toBe(false);
  });

  it("sending to another job or dormant restarts at Ny", () => {
    const c = testCandidates[0]!;
    expect(
      assignCandidate(testCandidates, c.id, "job-n2").find((x) => x.id === c.id),
    ).toMatchObject({ jobId: "job-n2", stage: "new" });
    expect(
      assignCandidate(testCandidates, c.id, null).find((x) => x.id === c.id)?.jobId,
    ).toBeNull();
  });
});

describe("interviewUrgency", () => {
  const now = new Date("2026-11-08T12:00");
  it("past", () => expect(interviewUrgency("2026-11-08T11:00", now)).toBe("past"));
  it("within two days is soon", () =>
    expect(interviewUrgency("2026-11-10T11:00", now)).toBe("soon"));
  it("within a week", () => expect(interviewUrgency("2026-11-13T12:00", now)).toBe("week"));
  it("later than a week", () => expect(interviewUrgency("2026-11-20T12:00", now)).toBe("later"));
});

describe("formatInterviewTime and interviewRelativeDays", () => {
  const now = new Date("2026-11-10T12:00");
  it("formats interview time within a month with relative days", () => {
    expect(formatInterviewTime("2026-11-18T11:53", now)).toBe("2026-11-18 kl. 11:53 (8 dagar)");
    expect(formatInterviewTime("2026-11-11T09:00", now)).toBe("2026-11-11 kl. 09:00 (1 dag)");
    expect(formatInterviewTime("2026-11-10T15:00", now)).toBe("2026-11-10 kl. 15:00 (idag)");
  });
  it("omits relative days when further away than one month", () => {
    expect(formatInterviewTime("2026-12-25T10:00", now)).toBe("2026-12-25 kl. 10:00");
    expect(interviewRelativeDays("2026-12-25T10:00", now)).toBeNull();
  });
  it("omits relative days when in the past", () => {
    expect(formatInterviewTime("2026-11-05T10:00", now)).toBe("2026-11-05 kl. 10:00");
    expect(interviewRelativeDays("2026-11-05T10:00", now)).toBeNull();
  });
  it("computes relative days separately", () => {
    expect(interviewRelativeDays("2026-11-18T11:53", now)).toBe("8 dagar");
    expect(interviewRelativeDays("2026-11-11T09:00", now)).toBe("1 dag");
    expect(interviewRelativeDays("2026-11-10T15:00", now)).toBe("idag");
  });
});

describe("formatDate", () => {
  it("formats ISO timestamps to YYYY-MM-DD", () => {
    expect(formatDate("2026-10-19T10:00:00Z")).toBe("2026-10-19");
    expect(formatDate("2026-11-08T14:30:15.123+01:00")).toBe("2026-11-08");
  });
  it("returns empty string for null, undefined or empty string", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});
