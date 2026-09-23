// Calendar (.ics) utilities: generating an invite file for a plan, and
// parsing a pasted/uploaded .ics file to import someone else's calendar.
// This is a small, deliberately non-exhaustive RFC5545 reader — it covers
// the shapes Google/Apple/Outlook actually export (plain + weekly/monthly
// recurring VEVENTs), not the full spec.

function pad2(n) { return String(n).padStart(2, "0"); }
function isoDate(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}
function shiftIsoByUnit(iso, unit, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (unit === "DAILY") dt.setDate(dt.getDate() + n);
  else if (unit === "WEEKLY") dt.setDate(dt.getDate() + 7 * n);
  else if (unit === "MONTHLY") dt.setMonth(dt.getMonth() + n);
  else if (unit === "YEARLY") dt.setFullYear(dt.getFullYear() + n);
  return isoDate(dt);
}

export function icsCompactDate(iso) { return iso.replace(/-/g, ""); }
export function icsEscape(s) { return (s || "").replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n"); }
export function icsUnescape(s) { return (s || "").replace(/\\n/g, "\n").replace(/\\([\\,;])/g, "$1"); }

export function generateICS(p, targetName) {
  const dtstart = icsCompactDate(p.dateKey);
  const dtend = icsCompactDate(shiftIso(p.endDateKey || p.dateKey, 1));
  const stamp = `${icsCompactDate(isoDate(new Date()))}T000000Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sync//EN",
    "BEGIN:VEVENT",
    `UID:${p.id}@sync.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${icsEscape(p.title)}`,
    p.time ? `DESCRIPTION:${icsEscape((p.message ? p.message + "\\n\\n" : "") + `Time: ${p.time} (${targetName || "organizer"}'s local time)`)}` : (p.message ? `DESCRIPTION:${icsEscape(p.message)}` : null),
    p.city ? `LOCATION:${icsEscape(p.city)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function downloadICS(p, targetName) {
  const content = generateICS(p, targetName);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(p.title || "plan").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// "20260214" -> "2026-02-14" · "20260214T190000Z" -> { dateKey, time }
function parseIcsDate(raw, params) {
  const isDateOnly = /^\d{8}$/.test(raw) || (params || "").includes("VALUE=DATE");
  const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
  const dateKey = `${y}-${m}-${d}`;
  if (isDateOnly) return { dateKey, time: "" };
  const hh = Number(raw.slice(9, 11) || 0);
  const mm = raw.slice(11, 13) || "00";
  const label = `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${hh < 12 ? "AM" : "PM"}`;
  return { dateKey, time: label };
}

function unfoldLines(text) {
  const rawLines = text.split(/\r\n|\n|\r/);
  const lines = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseRRule(value) {
  const parts = Object.fromEntries(value.split(";").map((kv) => kv.split("=")));
  return {
    freq: parts.FREQ || null,
    interval: parts.INTERVAL ? Number(parts.INTERVAL) : 1,
    count: parts.COUNT ? Number(parts.COUNT) : null,
    until: parts.UNTIL ? parts.UNTIL.slice(0, 8) : null, // compare as YYYYMMDD-ish string
  };
}

// Expands one recurring VEVENT into concrete occurrences (capped, so a
// malformed/unbounded rule can't hang the browser).
export function expandRRule(event, maxOccurrences = 52) {
  if (!event.rrule || !event.rrule.freq) return [event];
  const { freq, interval, count, until } = event.rrule;
  const span = Math.round(
    (new Date(...event.endDateKey.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n)))) -
      new Date(...event.dateKey.split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))) / 86400000
  );
  const limit = Math.min(count || maxOccurrences, maxOccurrences);
  const occurrences = [];
  for (let i = 0; i < limit; i++) {
    const start = shiftIsoByUnit(event.dateKey, freq, i * interval);
    if (until && icsCompactDate(start) > until) break;
    occurrences.push({ ...event, dateKey: start, endDateKey: shiftIso(start, span), id: `${event.uid}-${i}` });
  }
  return occurrences;
}

// Parses raw .ics text into a flat list of { uid, title, location, time, dateKey, endDateKey }.
// Recurring events are expanded inline via expandRRule.
export function parseICS(text) {
  const lines = unfoldLines(text);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) { cur = {}; continue; }
    if (line.startsWith("END:VEVENT")) {
      if (cur && cur.dtstart) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyPart = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [key, ...paramParts] = keyPart.split(";");
    const params = paramParts.join(";");
    if (key === "SUMMARY") cur.title = icsUnescape(value);
    else if (key === "LOCATION") cur.location = icsUnescape(value);
    else if (key === "DESCRIPTION") cur.description = icsUnescape(value);
    else if (key === "UID") cur.uid = value;
    else if (key === "RRULE") cur.rrule = parseRRule(value);
    else if (key === "DTSTART") { const { dateKey, time } = parseIcsDate(value, params); cur.dtstart = value; cur.dateKey = dateKey; cur.time = time; }
    else if (key === "DTEND") {
      const { dateKey } = parseIcsDate(value, params);
      const allDay = /^\d{8}$/.test(value) || params.includes("VALUE=DATE");
      cur.endDateKey = allDay ? shiftIso(dateKey, -1) : dateKey;
    }
  }

  const expanded = [];
  for (const raw of events) {
    const base = {
      uid: raw.uid || `${raw.dateKey}-${raw.title}`,
      title: raw.title || "Untitled event",
      location: raw.location || "",
      time: raw.time || "",
      dateKey: raw.dateKey,
      endDateKey: raw.endDateKey || raw.dateKey,
      rrule: raw.rrule || null,
    };
    expanded.push(...expandRRule(base));
  }
  return expanded;
}
