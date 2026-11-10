import { describe, expect, it } from "vitest";
import { RESUME_MAX_BYTES, formatBytes, validateResumeFile } from "@/lib/resume-file";

const PDF_BYTES = new TextEncoder().encode("%PDF-1.7 fake body");

function pdfFile(opts: { name?: string; type?: string; bytes?: Uint8Array; size?: number }) {
  const bytes = opts.bytes ?? PDF_BYTES;
  const blob = new Blob([bytes as unknown as BlobPart], { type: opts.type ?? "application/pdf" });
  return new File([blob], opts.name ?? "cv.pdf");
}

describe("validateResumeFile", () => {
  it("accepts a normal PDF", async () => {
    expect(await validateResumeFile(pdfFile({}))).toBeUndefined();
  });

  it("rejects other file types", async () => {
    expect(
      await validateResumeFile(pdfFile({ name: "cv.exe", type: "application/x-msdownload" })),
    ).toBe("Endast PDF-filer kan laddas upp");
  });

  it("rejects non-PDF content renamed to .pdf", async () => {
    const gif = new TextEncoder().encode("GIF89a not a pdf");
    expect(await validateResumeFile(pdfFile({ bytes: gif }))).toBe(
      "Filen verkar inte vara en riktig PDF",
    );
  });

  it("accepts a file exactly at the size limit", async () => {
    const padded = new Uint8Array(RESUME_MAX_BYTES);
    padded.set(PDF_BYTES, 0);
    expect(await validateResumeFile(pdfFile({ bytes: padded }))).toBeUndefined();
  });

  it("rejects files above the size limit", async () => {
    const padded = new Uint8Array(RESUME_MAX_BYTES + 1);
    padded.set(PDF_BYTES, 0);
    expect(await validateResumeFile(pdfFile({ bytes: padded }))).toBe("CV:t får vara max 5 MB");
  });
});

describe("formatBytes", () => {
  it("formats kilobytes and megabytes in Swedish", () => {
    expect(formatBytes(2048)).toBe("2 kB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});
