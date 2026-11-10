/** Client-side guard for resume uploads, for immediate feedback only.
 * The resumes bucket enforces the same limits server side (5 MB, PDF mime type),
 * and the magic-byte check here catches renamed non-PDF files early. */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export async function validateResumeFile(file: File): Promise<string | undefined> {
  const looksPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) return "Endast PDF-filer kan laddas upp";
  if (file.size > RESUME_MAX_BYTES) return "CV:t får vara max 5 MB";

  let header = "";
  if (typeof file.arrayBuffer === "function") {
    const buf = await file.arrayBuffer();
    header = new TextDecoder().decode(buf.slice(0, 5));
  } else if (typeof FileReader !== "undefined") {
    header = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result;
        if (res instanceof ArrayBuffer) {
          resolve(new TextDecoder().decode(res.slice(0, 5)));
        } else if (typeof res === "string") {
          resolve(res.slice(0, 5));
        } else {
          resolve("");
        }
      };
      reader.onerror = () => resolve("");
      reader.readAsArrayBuffer(file.slice(0, 5));
    });
  }

  if (header !== "%PDF-") return "Filen verkar inte vara en riktig PDF";
  return undefined;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}
