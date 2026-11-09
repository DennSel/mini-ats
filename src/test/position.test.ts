import { describe, expect, it, vi } from "vitest";
import {
  fetchJobs,
  planMoveCandidate,
  positionBetween,
  toCandidate,
  toJob,
  type SupabaseLike,
} from "@/lib/position";
import type { Candidate } from "@/lib/types";

describe("position and row mappers", () => {
  it("positionBetween calculates positions correctly", () => {
    expect(positionBetween()).toBe(1000);
    expect(positionBetween(undefined, 2000)).toBe(1000);
    expect(positionBetween(1000, undefined)).toBe(2000);
    expect(positionBetween(1000, 2000)).toBe(1500);
  });

  it("toCandidate maps snake_case database rows to camelCase", () => {
    const mapped = toCandidate({
      id: "cand-1",
      org_id: "org-1",
      job_id: "job-1",
      name: "Alice Lind",
      email: "alice@example.com",
      phone: "070-123 45 67",
      linkedin: "https://www.linkedin.com/in/alice-lind",
      note: "Strong TypeScript background",
      links: [{ id: "l-1", label: "GitHub", url: "https://github.com/alice" }],
      interview_at: "2026-11-15T14:30:00.000Z",
      interview_link: "https://meet.google.com/abc-defg-hij",
      stage: "interview",
      position: 1500,
      created_by: "user-1",
      created_at: "2026-11-09T08:00:00.000Z",
    });

    expect(mapped).toEqual({
      id: "cand-1",
      orgId: "org-1",
      jobId: "job-1",
      name: "Alice Lind",
      email: "alice@example.com",
      phone: "070-123 45 67",
      linkedin: "https://www.linkedin.com/in/alice-lind",
      note: "Strong TypeScript background",
      links: [{ id: "l-1", label: "GitHub", url: "https://github.com/alice" }],
      interviewAt: "2026-11-15T14:30",
      interviewLink: "https://meet.google.com/abc-defg-hij",
      stage: "interview",
      position: 1500,
      createdBy: "user-1",
      createdAt: "2026-11-09",
    });
  });

  it("toJob maps snake_case database rows to camelCase", () => {
    const mapped = toJob({
      id: "job-1",
      org_id: "org-1",
      title: "Frontend Developer",
      location: "Stockholm",
      description: "React & TypeScript",
      status: "open",
      created_at: "2026-11-09T08:00:00.000Z",
    });

    expect(mapped.orgId).toBe("org-1");
    expect(mapped.createdAt).toBe("2026-11-09");
  });

  it("renumbers target column with step 1000 when position gap is below 0.000001", () => {
    const base: Omit<Candidate, "id" | "position"> = {
      orgId: "org-1",
      jobId: "job-1",
      name: "Test",
      email: "",
      phone: "",
      linkedin: "",
      links: [],
      note: "",
      stage: "interview",
      createdAt: "2026-11-09",
    };

    const list: Candidate[] = [
      { ...base, id: "c1", position: 1000 },
      { ...base, id: "c2", position: 1000.0000005 },
      { ...base, id: "c3", stage: "new", position: 2000 },
    ];

    const planned = planMoveCandidate(list, "c3", "interview", "c2");
    expect(planned).not.toBeNull();
    expect(planned?.renumbered).toEqual([
      { id: "c1", stage: "interview", position: 1000 },
      { id: "c3", stage: "interview", position: 2000 },
      { id: "c2", stage: "interview", position: 3000 },
    ]);
    expect(planned?.position).toBe(2000);
  });

  it("fetchJobs always filters by org_id", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "job-1",
          org_id: "org-nordvik",
          title: "Backend Engineer",
          location: "Göteborg",
          description: "Postgres & Go",
          status: "open",
          created_at: "2026-11-09T09:00:00Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const client: SupabaseLike = { from };

    const jobs = await fetchJobs("org-nordvik", client);
    expect(from).toHaveBeenCalledWith("jobs");
    expect(eq).toHaveBeenCalledWith("org_id", "org-nordvik");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.orgId).toBe("org-nordvik");
  });
});
