import { weekdays, type ScheduleRule, type Weekday } from "./directory-schema";

const dayShort: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const dayLong: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export function formatTime(t: string | null | undefined) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number) as [number, number];
  if (h === 24 || (h === 0 && m === 0)) return "Midnight";
  if (h === 12 && m === 0) return "Noon";
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}

/** ["tue","wed","thu","fri"] → "Tue–Fri"; ["sun","mon","tue"] → "Sun–Tue" (wraps the week); ["sat","sun"] → "Sat & Sun". */
export function formatDays(days: Weekday[]) {
  const idx = [...new Set(days)].map((d) => weekdays.indexOf(d)).sort((a, b) => a - b);
  if (idx.length === 1) return `${dayLong[weekdays[idx[0]!]!]}s`;
  if (idx.length > 2 && idx.length < 7) {
    // Find a rotation of the week in which the days form one consecutive run.
    for (const start of idx) {
      const run = idx.map((i) => (i - start + 7) % 7).sort((a, b) => a - b);
      if (run.every((v, k) => v === k)) return `${dayShort[weekdays[start]!]}–${dayShort[weekdays[(start + run.length - 1) % 7]!]}`;
    }
  }
  if (idx.length === 7) return "Daily";
  if (idx.length === 2) return idx.map((i) => dayShort[weekdays[i]!]).join(" & ");
  return idx.map((i) => dayShort[weekdays[i]!]).join(", ");
}

export function formatDate(iso: string, withYear = false) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

export function formatRule(rule: ScheduleRule) {
  const opens = formatTime(rule.opens), closes = formatTime(rule.closes);
  const hours = opens && closes ? `${opens} – ${closes}` : "Check the official website for hours";
  const range = rule.starts_on && rule.ends_on ? `${formatDate(rule.starts_on)} – ${formatDate(rule.ends_on, true)}` : rule.starts_on ? `From ${formatDate(rule.starts_on, true)}` : rule.ends_on ? `Through ${formatDate(rule.ends_on, true)}` : "";
  return { days: formatDays(rule.days), hours, range, label: rule.label, note: rule.note ?? "" };
}

/** schema.org OpeningHoursSpecification — only rules with published hours. */
export function openingHoursSpec(rules: ScheduleRule[]) {
  return rules
    .filter((r) => r.opens && r.closes)
    .map((r) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: r.days.map((d) => `https://schema.org/${dayLong[d]}`),
      opens: r.opens,
      closes: r.closes === "24:00" ? "23:59" : r.closes,
      ...(r.starts_on ? { validFrom: r.starts_on } : {}),
      ...(r.ends_on ? { validThrough: r.ends_on } : {}),
    }));
}
