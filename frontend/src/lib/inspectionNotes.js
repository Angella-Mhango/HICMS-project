// Legacy inspections append internal reporting metadata to the notes field.
// Keep the stored value intact; only remove that metadata for display.
export function getInspectionNotes(notes) {
  if (typeof notes !== "string") return "";

  return notes
    .replace(/\bINSPECTION_TYPE_ID=\d+\b/g, "")
    .replace(/\bSTANDARD_PERFORMANCE=[\s\S]*$/, "")
    .trim();
}
