/** Display SQLite / Postgres datetime strings in the user's locale. */
export function formatDateTime(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === "") return "—";
  const normalized = raw.includes("T") ? raw : raw.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
