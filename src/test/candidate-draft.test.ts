import { describe, expect, it } from "vitest";
import { hasCandidateDraftChanges } from "@/lib/candidate-draft";
import { candidateSchema } from "@/components/board/CandidateDialog";

describe("candidate unsaved changes", () => {
  it("detects unsaved notes and ignores unchanged empty interview fields", () => {
    const saved = { note: "a note" };
    expect(
      hasCandidateDraftChanges({ note: "an edit", interviewAt: "", interviewLink: "" }, saved),
    ).toBe(true);
    expect(
      hasCandidateDraftChanges({ note: "a note", interviewAt: "", interviewLink: "" }, saved),
    ).toBe(false);
  });
  it("detects changes to interview date and meeting link", () => {
    const saved = { interviewAt: "2026-11-10T14:00", interviewLink: "https://meet.google.com/abc" };
    expect(hasCandidateDraftChanges({ ...saved, interviewAt: "2026-11-11T14:00" }, saved)).toBe(
      true,
    );
    expect(
      hasCandidateDraftChanges({ ...saved, interviewLink: "https://meet.google.com/def" }, saved),
    ).toBe(true);
    expect(hasCandidateDraftChanges(saved, saved)).toBe(false);
  });
  it("preserves edited interview values when saving a candidate", () => {
    const result = candidateSchema.parse({
      name: "Anna Test",
      email: "",
      phone: "",
      linkedin: "",
      note: "",
      jobId: "job-n1",
      stage: "interview",
      interviewAt: "2026-11-12T15:30",
      interviewLink: "HTTPS://meet.google.com/abc",
    });
    expect(result.interviewAt).toBe("2026-11-12T15:30");
    expect(result.interviewLink).toBe("https://meet.google.com/abc");
  });
});
