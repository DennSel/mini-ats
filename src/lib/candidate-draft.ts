/** Compare editable values, treating absent optional fields as empty inputs. */
export function hasCandidateDraftChanges(
  draft: Record<string, unknown>,
  saved: Record<string, unknown>,
): boolean {
  return Object.keys(draft).some(
    (key) => JSON.stringify(draft[key] ?? "") !== JSON.stringify(saved[key] ?? ""),
  );
}
