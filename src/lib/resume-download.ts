import { toast } from "sonner";
import { supabase } from "./supabase";
import { getDemoResumeBlob } from "./demo-data";

export async function openResumeInNewTab(resumePath: string, candidateName: string): Promise<void> {
  const win = window.open("", "_blank");
  try {
    let blob: Blob | null = null;
    if (resumePath.startsWith("demo:")) {
      blob = getDemoResumeBlob(resumePath);
    } else {
      const { data, error } = await supabase.storage.from("resumes").download(resumePath);
      if (error || !data) throw error ?? new Error("No data");
      blob = data;
    }

    const blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
    if (win) {
      win.location.href = blobUrl;
    } else {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${candidateName}-cv.pdf`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  } catch {
    win?.close();
    toast.error("Kunde inte öppna CV:t");
  }
}
