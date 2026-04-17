/**
 * Prisma stores DateTime as Postgres `timestamp without time zone` in UTC.
 * Raw SQL `::text` returns no offset; `new Date("2026-04-17 04:13:00")` is parsed as local time in the browser, skewing IST by 5:30. Treat naive timestamps as UTC.
 */
function parseUtcAware(iso: string): Date {
  const t = iso.trim();
  const hasZone =
    /[zZ]$/.test(t) ||
    // +05:30 / +0530 / +00 / +0000
    /[+-]\d{2}(?::?\d{2})?$/.test(t) ||
    /[+-]\d{4}$/.test(t);
  if (hasZone) return new Date(t);
  const naive =
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(t);
  if (naive) return new Date(`${naive[1]}T${naive[2]}Z`);
  return new Date(t);
}

export function formatIst(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseUtcAware(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

