import { describe, expect, it } from "vitest";
import {
  activeOrgFor,
  assignCandidate,
  can,
  canAccessAdmin,
  isLastOwner,
  filterCandidates,
  homePathFor,
  moveCandidate,
} from "@/lib/ats-logic";
import { seedCandidates, seedUsers, type User } from "@/lib/mock-data";

const admin = seedUsers.find((u) => u.role === "admin")!;
const customer = seedUsers.find((u) => u.id === "u-anna")!;

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
    const res = filterCandidates(seedCandidates, { orgId: "org-nordvik" });
    expect(res).toHaveLength(14);
    expect(res.every((c) => c.orgId === "org-nordvik")).toBe(true);
  });

  it("moves a candidate to a new stage", () => {
    const id = seedCandidates[0]!.id;
    const res = moveCandidate(seedCandidates, id, "hired");
    expect(res.find((c) => c.id === id)?.stage).toBe("hired");
    expect(res).toHaveLength(seedCandidates.length);
  });

  it("pipeline hides dormant candidates", () => {
    const res = filterCandidates(seedCandidates, { orgId: "org-nordvik", assignedOnly: true });
    expect(res).toHaveLength(12);
  });

  it("role permissions", () => {
    const as = (orgRole: User["orgRole"]) => ({ ...customer, orgRole });
    expect(can(as("owner"), "manageTeam")).toBe(true);
    expect(can(as("recruiter"), "manageTeam")).toBe(false);
    expect(can(as("recruiter"), "manageJobs")).toBe(true);
    expect(can(as("reviewer"), "moveCandidates")).toBe(true);
    expect(can(as("reviewer"), "manageCandidates")).toBe(false);
    expect(can(as("viewer"), "moveCandidates")).toBe(false);
    expect(can(admin, "manageTeam")).toBe(true);
  });

  it("last owner of an org is protected", () => {
    expect(isLastOwner(seedUsers, "u-anna")).toBe(true);
    expect(isLastOwner(seedUsers, "u-lars")).toBe(false);
  });

  it("sending to another job or dormant restarts at Ny", () => {
    const c = seedCandidates.find(
      (x) => x.stage === "interview" && x.jobId !== "job-n2" && x.orgId === "org-nordvik",
    )!;
    expect(
      assignCandidate(seedCandidates, c.id, "job-n2").find((x) => x.id === c.id),
    ).toMatchObject({ jobId: "job-n2", stage: "new" });
    expect(
      assignCandidate(seedCandidates, c.id, null).find((x) => x.id === c.id)?.jobId,
    ).toBeNull();
  });
});

import { canSeeJob, visibleCandidates } from "@/lib/ats-logic";

describe("permission matrix", () => {
  const mk = (orgRole: User["orgRole"]): User => ({ ...customer, orgRole });
  it("everyone can view; reviewer moves and notes but cannot edit candidates or jobs", () => {
    expect(can(mk("viewer"), "moveCandidates")).toBe(false);
    expect(can(mk("reviewer"), "moveCandidates")).toBe(true);
    expect(can(mk("reviewer"), "manageCandidates")).toBe(false);
    expect(can(mk("recruiter"), "manageCandidates")).toBe(true);
    expect(can(mk("recruiter"), "manageJobs")).toBe(true);
    expect(can(mk("recruiter"), "manageTeam")).toBe(false);
    expect(can(mk("owner"), "manageTeam")).toBe(true);
  });
});

describe("job access", () => {
  const limited: User = { ...customer, orgRole: "reviewer", jobIds: ["job-n1"] };
  it("member with limited access only sees given jobs; owners see all", () => {
    expect(canSeeJob(limited, "job-n1")).toBe(true);
    expect(canSeeJob(limited, "job-n2")).toBe(false);
    expect(canSeeJob({ ...limited, orgRole: "owner" }, "job-n2")).toBe(true);
    expect(canSeeJob({ ...customer, orgRole: "reviewer" }, "job-n2")).toBe(true);
  });
  it("dormant candidates stay visible, other jobs' candidates are hidden", () => {
    const vis = visibleCandidates(limited, seedCandidates, "org-nordvik");
    expect(vis.every((c) => c.jobId === null || c.jobId === "job-n1")).toBe(true);
    expect(vis.some((c) => c.jobId === null)).toBe(true);
  });
});
