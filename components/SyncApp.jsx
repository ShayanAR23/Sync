"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Settings, Sun, Moon, CalendarDays, PartyPopper, MessageCircle, Users, Camera } from "lucide-react";
// Client-only: its slide animation seeds a randomized layout per mount,
// which must never be part of the server-rendered HTML (would mismatch
// on hydration since the server and client would each roll different values).
const IntroStory = dynamic(() => import("./IntroStory"), { ssr: false });
import { Avatar, AvatarPicker } from "./Avatar";
import { BackgroundPicker } from "./BackgroundPicker";
import { PhoneShell, BottomTabBar } from "./PhoneShell";
import { downloadICS, parseICS } from "./ics";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8am - 11pm
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_NAMES_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Default per-month look for the hero calendar — a themed gradient + big
// motif icon, overridable per year-month with a custom uploaded image.
const MONTH_THEMES = [
  { grad: "linear-gradient(160deg,#1e3a5f 0%,#0f2540 100%)", icon: "❄️" },
  { grad: "linear-gradient(160deg,#5b2a6e 0%,#2e1440 100%)", icon: "💘" },
  { grad: "linear-gradient(160deg,#2f5f4a 0%,#163326 100%)", icon: "🌱" },
  { grad: "linear-gradient(160deg,#3f7a3a 0%,#1e3d19 100%)", icon: "🌷" },
  { grad: "linear-gradient(160deg,#6a8f3a 0%,#33450f 100%)", icon: "🌸" },
  { grad: "linear-gradient(160deg,#c98a1f 0%,#7a4f0a 100%)", icon: "☀️" },
  { grad: "linear-gradient(160deg,#d9541f 0%,#7a2a0a 100%)", icon: "🎆" },
  { grad: "linear-gradient(160deg,#c9781f 0%,#6e3d0a 100%)", icon: "🏖️" },
  { grad: "linear-gradient(160deg,#a05a2a 0%,#4f2a10 100%)", icon: "🍂" },
  { grad: "linear-gradient(160deg,#9a4a1f 0%,#4a1f0a 100%)", icon: "🎃" },
  { grad: "linear-gradient(160deg,#6a4a2a 0%,#2a1a10 100%)", icon: "🦃" },
  { grad: "linear-gradient(160deg,#1c3a5f 0%,#0a1a30 100%)", icon: "🎄" },
];

// Fixed-date holidays (month is 1-indexed to match everyday date labels).
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "New Year's Day", icon: "🎆" },
  { month: 2, day: 14, name: "Valentine's Day", icon: "💘" },
  { month: 3, day: 17, name: "St. Patrick's Day", icon: "🍀" },
  { month: 7, day: 4, name: "Independence Day", icon: "🎇" },
  { month: 10, day: 31, name: "Halloween", icon: "🎃" },
  { month: 12, day: 25, name: "Christmas", icon: "🎄" },
  { month: 12, day: 31, name: "New Year's Eve", icon: "🥂" },
];
// nth (1-based) occurrence of a weekday (0=Sun) in a given month/year.
function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return 1 + offset + (n - 1) * 7;
}
function holidayForDate(d) {
  const month = d.getMonth() + 1, day = d.getDate(), year = d.getFullYear();
  const fixed = FIXED_HOLIDAYS.find((h) => h.month === month && h.day === day);
  if (fixed) return fixed;
  if (month === 11 && day === nthWeekdayOfMonth(year, 11, 4, 4)) return { name: "Thanksgiving", icon: "🦃" };
  return null;
}

const TZ_OPTIONS = [
  { label: "Pacific (PT)", offset: -8 },
  { label: "Mountain (MT)", offset: -7 },
  { label: "Central (CT)", offset: -6 },
  { label: "Eastern (ET)", offset: -5 },
  { label: "GMT", offset: 0 },
  { label: "Central Europe (CET)", offset: 1 },
];

// Half-hour time-of-day options, e.g. "7:00 PM", for the propose-a-date form.
const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      out.push(`${hour12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  }
  return out;
})();

function hourLabel(h) {
  if (h === 12) return "12p";
  if (h > 12) return `${h - 12}p`;
  return `${h}a`;
}
function tzLabelFor(offset) {
  const found = TZ_OPTIONS.find((t) => t.offset === offset);
  return found ? found.label : `GMT${offset >= 0 ? "+" : ""}${offset}`;
}

const COLOR_PALETTE = [
  { name: "sky", hex: "#6E9FC1" },
  { name: "ember", hex: "#C1594B" },
  { name: "lilac", hex: "#B98CC1" },
  { name: "wheat", hex: "#D6C86B" },
  { name: "rose", hex: "#D07A8C" },
  { name: "teal", hex: "#5FA8A0" },
  { name: "mint", hex: "#8FCB8A" },
  { name: "periwinkle", hex: "#8C97D6" },
];
const GROUP_SHAPES = ["●", "■", "▲", "◆", "★", "⬟", "✚", "◼"];


// ---- date helpers ----
function next12Months(start = new Date()) {
  const months = [];
  let y = start.getFullYear();
  let m = start.getMonth();
  for (let i = 0; i < 12; i++) {
    months.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}
function monthGridCells(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Monday
  const cells = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= totalDays; day++) cells.push(new Date(year, month, day));
  return cells;
}
function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isToday(d) {
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}
function niceDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}
function fullDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTH_NAMES_FULL[m - 1]} ${d}, ${y}`;
}
function daysFromToday(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - startOfToday) / 86400000);
}
function rangeLabel(startIso, endIso) {
  if (startIso === endIso) return niceDateLabel(startIso);
  const [ys, ms, ds] = startIso.split("-").map(Number);
  const [ye, me, de] = endIso.split("-").map(Number);
  if (ms === me) return `${MONTH_NAMES[ms - 1]} ${ds}-${de}`;
  return `${MONTH_NAMES[ms - 1]} ${ds}-${MONTH_NAMES[me - 1]} ${de}`;
}
function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDate(dt);
}
function shiftIsoByUnit(iso, unit, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (unit === "weekly") dt.setDate(dt.getDate() + 7 * n);
  else if (unit === "monthly") dt.setMonth(dt.getMonth() + n);
  return isoDate(dt);
}
function groupConsecutiveDates(sortedIsoDates) {
  const ranges = [];
  let start = null, prev = null;
  for (const iso of sortedIsoDates) {
    if (start === null) { start = iso; prev = iso; continue; }
    const [py, pm, pd] = prev.split("-").map(Number);
    const [cy, cm, cd] = iso.split("-").map(Number);
    const diff = Math.round((new Date(cy, cm - 1, cd) - new Date(py, pm - 1, pd)) / 86400000);
    if (diff === 1) { prev = iso; }
    else { ranges.push([start, prev]); start = iso; prev = iso; }
  }
  if (start !== null) ranges.push([start, prev]);
  return ranges;
}

// deterministic mock generator standing in for a synced calendar
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
function seededFree(seedStr, threshold) {
  const h = hashStr(seedStr);
  const x = Math.sin(h) * 10000;
  const r = x - Math.floor(x);
  return r < threshold;
}
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function tentativePattern(hex) {
  return `repeating-linear-gradient(45deg, ${hexToRgba(hex, 0.45)} 0px, ${hexToRgba(hex, 0.45)} 3px, transparent 3px, transparent 6px)`;
}

// Maps any free/total fraction to a "filling up" moon phase — deliberately
// only the waxing half of the lunar cycle (new -> full), since the waning
// half would visually look like it's emptying back out. Fraction-based
// (not headcount-based) so it scales to groups of any size, not just <=8.
const MOON_PHASES = ["🌑", "🌒", "🌓", "🌔", "🌕"];
function moonPhaseEmoji(fraction) {
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
  return MOON_PHASES[Math.round(f * (MOON_PHASES.length - 1))];
}

const ALL_YEAR_KEYS = (() => {
  const keys = [];
  for (const { year, month } of next12Months()) {
    for (const d of monthGridCells(year, month)) if (d) keys.push(isoDate(d));
  }
  return keys;
})();
const ALL_WEEK_KEYS = (() => {
  const keys = [];
  for (const day of DAYS) for (const hour of HOURS) keys.push(`${day}-${hour}`);
  return keys;
})();

const TAB_TITLES = { groups: "My Calendar", friends: "Friends Calendars", plans: "Plans", messages: "Messages" };

export default function SyncApp() {
  const [tab, setTab] = useState("groups"); // "groups" (personal calendar) | "plans" | "messages" | "events"
  const [themeMode, setThemeMode] = useState("dark"); // "dark" | "light"
  const [showSettings, setShowSettings] = useState(false);
  const [plansFilter, setPlansFilter] = useState("upcoming"); // "upcoming" | "past"
  const [showManage, setShowManage] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [pastPlansSearch, setPastPlansSearch] = useState("");
  const [seenSnapshot, setSeenSnapshot] = useState({}); // { [proposalId]: { threadLen, rsvpJson } }
  const prevTabRef = useRef(tab);
  const [horizon, setHorizon] = useState("year"); // "week" | "year"
  // Whose availability the Friends Calendars tab is showing: a group id, a person id, or "you".
  const [friendsView, setFriendsView] = useState(null);

  // ---- app-like intro slideshow, shown on every load ----
  const [showOnboarding, setShowOnboarding] = useState(true);
  const dismissOnboarding = () => {
    setShowOnboarding(false);
  };

  // ---- hero calendar (mini month + day detail) state ----
  const todayIso = isoDate(new Date());
  const [selectedDayIso, setSelectedDayIso] = useState(todayIso);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  // { "YYYY-M": dataURL-or-gradient } — a custom background per calendar month, overriding MONTH_THEMES.
  const [monthBackgrounds, setMonthBackgrounds] = useState({});
  const [showMonthBgPicker, setShowMonthBgPicker] = useState(false);

  const [people, setPeople] = useState([
    { id: "you", name: "You", color: "#E4A94A", city: "Austin, TX", tz: -6 },
    { id: "jordan", name: "Aadil", color: COLOR_PALETTE[0].hex, city: "Chicago, IL", tz: -6, birthday: "11-03" },
    { id: "maya", name: "Ahad", color: COLOR_PALETTE[1].hex, city: "Beijing, China", tz: 8, birthday: "06-21" },
    { id: "sarah", name: "Shayan", color: COLOR_PALETTE[2].hex, city: "New York, NY", tz: -5, birthday: "09-25" },
    { id: "chris", name: "Yaseen", color: COLOR_PALETTE[3].hex, city: "San Francisco, CA", tz: -8, birthday: "12-08" },
  ]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const updatePerson = (id, patch) => setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateGroup = (id, patch) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const you = peopleById["you"];

  const [groups, setGroups] = useState([
    { id: "weekend-crew", name: "Weekend Crew", color: COLOR_PALETTE[4].hex, shape: GROUP_SHAPES[0], memberIds: ["jordan", "maya", "chris"] },
  ]);

  // availability[personId][key] = "free" | "tentative"
  const [availability, setAvailability] = useState({});
  const getStatus = (personId, key) => availability[personId]?.[key];
  const setStatus = (personId, key, value) => {
    setAvailability((prev) => {
      const next = { ...prev, [personId]: { ...(prev[personId] || {}) } };
      if (value) next[personId][key] = value;
      else delete next[personId][key];
      return next;
    });
  };
  const seedPerson = (personId) => {
    setAvailability((prev) => {
      const bucket = {};
      for (const k of ALL_YEAR_KEYS) {
        if (seededFree(`${personId}-${k}`, 0.42)) bucket[k] = "free";
        else if (seededFree(`${personId}-tent-${k}`, 0.12)) bucket[k] = "tentative";
      }
      for (const k of ALL_WEEK_KEYS) {
        if (seededFree(`${personId}-${k}`, 0.4)) bucket[k] = "free";
        else if (seededFree(`${personId}-tent-${k}`, 0.1)) bucket[k] = "tentative";
      }
      return { ...prev, [personId]: bucket };
    });
  };
  const seededOnce = useRef(false);
  useEffect(() => {
    if (seededOnce.current) return;
    seededOnce.current = true;
    ["you", "jordan", "maya", "sarah", "chris"].forEach(seedPerson);
  }, []);

  const [editingAsId, setEditingAsId] = useState("you");
  const editingAsPerson = peopleById[editingAsId] || you;

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0].hex);
  const [newTz, setNewTz] = useState(-6);
  const [newAvatarEmoji, setNewAvatarEmoji] = useState(null);
  const [newAvatarPhoto, setNewAvatarPhoto] = useState(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(COLOR_PALETTE[5].hex);
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const [groupFormError, setGroupFormError] = useState("");

  const [proposals, setProposals] = useState([]);
  const [proposeDate, setProposeDate] = useState("");
  const [proposeGroupId, setProposeGroupId] = useState("");
  const [proposeCity, setProposeCity] = useState("");
  const [proposeTime, setProposeTime] = useState("");
  const [proposeTitle, setProposeTitle] = useState("");
  const [proposeMessage, setProposeMessage] = useState("");
  const [showProposeForm, setShowProposeForm] = useState(false);

  const [inspectedKey, setInspectedKey] = useState(null); // currently hovered/clicked day, Groups tab
  const [inspectedRangeEnd, setInspectedRangeEnd] = useState(null); // set when a multi-day bubble was clicked
  const [inviteNote, setInviteNote] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({}); // { proposalId: text }

  const [inspectingEntity, setInspectingEntity] = useState(null); // { type: "person"|"group", id } | null
  const [showCustomize, setShowCustomize] = useState(false);
  const [dmThreads, setDmThreads] = useState({}); // { "idA__idB": [{id, fromId, text}] }
  const [groupThreads, setGroupThreads] = useState({}); // { groupId: [{id, personId, text}] }
  const [dmDraft, setDmDraft] = useState("");

  // ---- app-wide wallpaper + imported (.ics) calendars ----
  const [appBackground, setAppBackground] = useState(null);
  const [importedCalendars, setImportedCalendars] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importName, setImportName] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!importName.trim()) setImportName(file.name.replace(/\.ics$/i, ""));
    const reader = new FileReader();
    reader.onload = () => setImportText(String(reader.result || ""));
    reader.readAsText(file);
  };
  const importCalendar = () => {
    if (!importText.trim()) { setImportError("Upload or paste the .ics file contents first."); return; }
    let events = [];
    try { events = parseICS(importText); } catch { events = []; }
    if (events.length === 0) { setImportError("Couldn't find any events in that file — check it's a valid .ics export."); return; }
    const id = `import-${Date.now()}`;
    const color = COLOR_PALETTE[importedCalendars.length % COLOR_PALETTE.length].hex;
    setImportedCalendars((cals) => [...cals, { id, name: importName.trim() || "Imported calendar", color, events }]);
    setImportName(""); setImportText(""); setImportError(""); setShowImportModal(false);
  };
  const removeImportedCalendar = (id) => setImportedCalendars((cals) => cals.filter((c) => c.id !== id));
  const importedEventsOnDay = (iso) => {
    const hits = [];
    for (const cal of importedCalendars) {
      for (const ev of cal.events) {
        if (iso >= ev.dateKey && iso <= (ev.endDateKey || ev.dateKey)) hits.push({ ...ev, calId: cal.id, calColor: cal.color, calName: cal.name });
      }
    }
    return hits;
  };

  const paintRef = useRef({ painting: false, value: "free" });
  const months = useMemo(() => next12Months(), []);

  // Scroll the "Propose a date manually" section into view whenever it opens
  // on the Friends Calendars tab — otherwise it can open far below the fold
  // (behind the moon calendars) and look like the button did nothing.
  const proposeFormRef = useRef(null);
  useEffect(() => {
    if (tab === "friends" && showProposeForm) {
      proposeFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [tab, showProposeForm]);

  useEffect(() => {
    const stop = () => (paintRef.current.painting = false);
    window.addEventListener("mouseup", stop);
    return () => window.removeEventListener("mouseup", stop);
  }, []);

  const nextStatus = (current) => (!current ? "free" : current === "free" ? "tentative" : undefined);

  const handleMouseDown = (key) => {
    const cur = getStatus(editingAsId, key);
    const value = nextStatus(cur);
    paintRef.current = { painting: true, value };
    setStatus(editingAsId, key, value);
  };
  const handleMouseEnter = (key) => {
    if (!paintRef.current.painting) return;
    setStatus(editingAsId, key, paintRef.current.value);
  };

  const groupFullyFree = (group, key) => ["you", ...group.memberIds].every((id) => getStatus(id, key) === "free");

  const addFriend = () => {
    const name = newName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setPeople((p) => [...p, { id, name, color: newColor, city: newCity.trim(), tz: newTz, avatarEmoji: newAvatarEmoji, avatarPhoto: newAvatarPhoto }]);
    setNewName(""); setNewCity(""); setShowAddFriend(false); setNewAvatarEmoji(null); setNewAvatarPhoto(null);
  };
  const removeFriend = (id) => {
    setPeople((p) => p.filter((x) => x.id !== id));
    setGroups((gs) => gs.map((g) => ({ ...g, memberIds: g.memberIds.filter((m) => m !== id) })).filter((g) => g.memberIds.length >= 2));
    setAvailability((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (editingAsId === id) setEditingAsId("you");
  };

  const toggleGroupMember = (id) => { setGroupFormError(""); setNewGroupMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])); };
  const createGroup = () => {
    const name = newGroupName.trim();
    if (!name) { setGroupFormError("Give the group a name first."); return; }
    if (newGroupMembers.length < 2) { setGroupFormError("Pick at least 2 friends — one friend isn't a group, message them directly instead."); return; }
    const id = `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setGroups((g) => [...g, { id, name, color: newGroupColor, shape: GROUP_SHAPES[g.length % GROUP_SHAPES.length], memberIds: newGroupMembers }]);
    setNewGroupName(""); setNewGroupMembers([]); setShowGroupForm(false); setGroupFormError("");
  };
  const removeGroup = (id) => {
    setGroups((g) => g.filter((x) => x.id !== id));
    setProposals((ps) => ps.filter((p) => !(p.kind === "group" && p.groupId === id)));
  };

  const createProposal = (kind, targetId, dateKey, title, message, location, endDateKey, time, seriesId, seriesLabel) => {
    if (!targetId || !dateKey) return;
    const id = `${kind}-${targetId}-${dateKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const defaultName = kind === "group" ? groups.find((x) => x.id === targetId)?.name : peopleById[targetId]?.name;
    const finalTitle = (title || "").trim() || `${defaultName || "Plan"} · ${rangeLabel(dateKey, endDateKey || dateKey)}`;
    setProposals((ps) => [...ps, {
      id, kind,
      groupId: kind === "group" ? targetId : null,
      personId: kind === "person" ? targetId : null,
      dateKey, endDateKey: endDateKey || dateKey,
      city: (location || "").trim(),
      time: (time || "").trim(),
      title: finalTitle, message: (message || "").trim(),
      fromId: editingAsId, rsvps: {}, thread: [], extraInviteeIds: [],
      seriesId: seriesId || null, seriesLabel: seriesLabel || null,
    }]);
    return id;
  };
  const updateProposal = (id, patch) => setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addInviteeToProposal = (proposalId, personId) => {
    setProposals((ps) => ps.map((p) => {
      if (p.id !== proposalId) return p;
      if ((p.extraInviteeIds || []).includes(personId)) return p;
      return { ...p, extraInviteeIds: [...(p.extraInviteeIds || []), personId] };
    }));
  };
  const proposalExists = (kind, targetId, dateKey) => proposals.some((p) => p.kind === kind && (kind === "group" ? p.groupId === targetId : p.personId === targetId) && p.dateKey === dateKey);

  // Invite modal: name + message + optional location/time/repeat before an invitation actually sends
  const [inviteModal, setInviteModal] = useState(null); // { kind: "group"|"person", targetId, dateKey, endDateKey } | null
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLocation, setInviteLocation] = useState("");
  const [inviteTime, setInviteTime] = useState("");
  const [inviteRepeat, setInviteRepeat] = useState("none"); // "none" | "weekly" | "monthly"

  const openInviteModal = (kind, targetId, dateKey, endDateKey) => {
    if (proposalExists(kind, targetId, dateKey)) { setInviteNote("Already invited — see the Plans tab."); return; }
    const name = kind === "group" ? groups.find((x) => x.id === targetId)?.name : peopleById[targetId]?.name;
    setInviteTitle(`${name || "Plan"} · ${rangeLabel(dateKey, endDateKey || dateKey)}`);
    setInviteMessage("");
    setInviteLocation("");
    setInviteTime("");
    setInviteRepeat("none");
    setInviteModal({ kind, targetId, dateKey, endDateKey: endDateKey || dateKey });
  };
  const sendInvite = () => {
    if (!inviteModal) return;
    const { kind, targetId, dateKey, endDateKey } = inviteModal;
    const name = kind === "group" ? groups.find((x) => x.id === targetId)?.name : peopleById[targetId]?.name;
    if (inviteRepeat === "none") {
      createProposal(kind, targetId, dateKey, inviteTitle, inviteMessage, inviteLocation, endDateKey, inviteTime);
    } else {
      const seriesId = `series-${Date.now()}`;
      const occurrences = 4;
      const span = (() => {
        const [ys, ms, ds] = dateKey.split("-").map(Number);
        const [ye, me, de] = (endDateKey || dateKey).split("-").map(Number);
        return Math.round((new Date(ye, me - 1, de) - new Date(ys, ms - 1, ds)) / 86400000);
      })();
      for (let i = 0; i < occurrences; i++) {
        const occStart = shiftIsoByUnit(dateKey, inviteRepeat, i);
        const occEnd = shiftIso(occStart, span);
        createProposal(kind, targetId, occStart, inviteTitle, inviteMessage, inviteLocation, occEnd, inviteTime, seriesId, `${inviteRepeat === "weekly" ? "Weekly" : "Monthly"} · ${i + 1} of ${occurrences}`);
      }
    }
    setInviteNote(`Invitation sent to ${name || "them"} for ${rangeLabel(dateKey, endDateKey || dateKey)}${inviteRepeat !== "none" ? ` (repeating ${inviteRepeat})` : ""} — see the Plans tab.`);
    setInviteModal(null);
  };

  useEffect(() => {
    const prev = prevTabRef.current;
    if (prev !== tab && (prev === "messages" || prev === "plans")) {
      setSeenSnapshot((snap) => {
        const next = { ...snap };
        proposals.forEach((p) => { next[p.id] = { threadLen: p.thread.length, rsvpJson: JSON.stringify(p.rsvps) }; });
        return next;
      });
    }
    prevTabRef.current = tab;
  }, [tab]);
  const hasUnreadThread = (p) => { const base = seenSnapshot[p.id]; return base ? p.thread.length > base.threadLen : p.thread.length > 0; };
  const hasUnreadRsvp = (p) => { const base = seenSnapshot[p.id]; return base ? JSON.stringify(p.rsvps) !== base.rsvpJson : Object.keys(p.rsvps).length > 0; };
  const anyUnreadMessages = proposals.some(hasUnreadThread);
  const anyUnreadPlans = proposals.some(hasUnreadRsvp);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const removeProposal = (id) => setProposals((ps) => ps.filter((p) => p.id !== id));
  const requestDeleteProposal = (id) => setConfirmDeleteId(id);
  const confirmDeleteProposal = () => { if (confirmDeleteId) removeProposal(confirmDeleteId); setConfirmDeleteId(null); };

  const [editingProposalId, setEditingProposalId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", message: "", city: "", time: "" });
  const startEditProposal = (p) => { setEditingProposalId(p.id); setEditDraft({ title: p.title, message: p.message, city: p.city, time: p.time || "" }); };
  const saveEditProposal = () => { if (editingProposalId) updateProposal(editingProposalId, { title: editDraft.title, message: editDraft.message, city: editDraft.city, time: editDraft.time }); setEditingProposalId(null); };

  const [inviteMoreForId, setInviteMoreForId] = useState(null);

  const setRsvp = (proposalId, personId, status) => {
    setProposals((ps) => ps.map((p) => (p.id === proposalId ? { ...p, rsvps: { ...p.rsvps, [personId]: status } } : p)));
  };
  const addReply = (proposalId, personId, text) => {
    if (!text.trim()) return;
    setProposals((ps) => ps.map((p) => (p.id === proposalId ? { ...p, thread: [...p.thread, { id: `${proposalId}-${Date.now()}`, personId, text: text.trim() }] } : p)));
  };

  const dmKey = (a, b) => [a, b].sort().join("__");
  const sendDM = (targetId, text) => {
    if (!text.trim()) return;
    const key = dmKey(editingAsId, targetId);
    setDmThreads((prev) => ({ ...prev, [key]: [...(prev[key] || []), { id: `${key}-${Date.now()}`, fromId: editingAsId, text: text.trim() }] }));
  };
  const sendGroupMessage = (groupId, text) => {
    if (!text.trim()) return;
    setGroupThreads((prev) => ({ ...prev, [groupId]: [...(prev[groupId] || []), { id: `${groupId}-${Date.now()}`, personId: editingAsId, text: text.trim() }] }));
  };

  // ---- message reactions (shared across proposal threads, DMs, and group chat) ----
  const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
  const [reactionPickerFor, setReactionPickerFor] = useState(null);
  const withToggledReaction = (message, emoji) => {
    const reactions = { ...(message.reactions || {}) };
    const users = new Set(reactions[emoji] || []);
    if (users.has(editingAsId)) users.delete(editingAsId); else users.add(editingAsId);
    if (users.size === 0) delete reactions[emoji]; else reactions[emoji] = Array.from(users);
    return { ...message, reactions };
  };
  const toggleThreadReaction = (proposalId, messageId, emoji) => {
    setProposals((ps) => ps.map((p) => (p.id !== proposalId ? p : { ...p, thread: p.thread.map((m) => (m.id === messageId ? withToggledReaction(m, emoji) : m)) })));
  };
  const toggleDmReaction = (key, messageId, emoji) => {
    setDmThreads((prev) => ({ ...prev, [key]: (prev[key] || []).map((m) => (m.id === messageId ? withToggledReaction(m, emoji) : m)) }));
  };
  const toggleGroupReaction = (groupId, messageId, emoji) => {
    setGroupThreads((prev) => ({ ...prev, [groupId]: (prev[groupId] || []).map((m) => (m.id === messageId ? withToggledReaction(m, emoji) : m)) }));
  };
  const MessageReactions = ({ message, onToggle }) => {
    const entries = Object.entries(message.reactions || {}).filter(([, ids]) => ids.length > 0);
    const pickerOpen = reactionPickerFor === message.id;
    return (
      <div className="flex items-center gap-1 flex-wrap mt-1.5 relative">
        {entries.map(([emoji, ids]) => {
          const mine = ids.includes(editingAsId);
          return (
            <button key={emoji} onClick={() => onToggle(emoji)} className="text-xs rounded-full px-2 py-0.5 flex items-center gap-1" style={{ background: mine ? "rgba(255,122,26,0.18)" : "var(--ink-3)", border: `1px solid ${mine ? "var(--marigold)" : "transparent"}` }}>
              <span>{emoji}</span><span className="mono" style={{ fontSize: 10, color: "var(--paper)" }}>{ids.length}</span>
            </button>
          );
        })}
        <button onClick={() => setReactionPickerFor(pickerOpen ? null : message.id)} className="text-xs rounded-full px-1.5 py-0.5" style={{ background: "var(--ink-3)", color: "var(--mist)" }}>+</button>
        {pickerOpen && (
          <div className="flex items-center gap-1 rounded-full px-2 py-1 absolute z-10" style={{ top: "100%", left: 0, marginTop: 4, background: "var(--ink-4)", boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
            {REACTION_EMOJIS.map((e) => (
              <button key={e} onClick={() => { onToggle(e); setReactionPickerFor(null); }} className="text-sm">{e}</button>
            ))}
          </div>
        )}
      </div>
    );
  };
  const openPersonProfile = (id) => { setInspectingEntity({ type: "person", id }); setDmDraft(""); setShowCustomize(false); };
  const openGroupProfile = (id) => { setInspectingEntity({ type: "group", id }); setDmDraft(""); setShowCustomize(false); };

  const dmSeeded = useRef(false);
  useEffect(() => {
    if (dmSeeded.current) return;
    dmSeeded.current = true;
    setDmThreads({ [dmKey("you", "sarah")]: [{ id: "dm-seed-1", fromId: "sarah", text: "Hey! Are you around the weekend of the 12th? Would love to grab dinner." }] });
  }, []);
  const proposalParticipants = (p) => {
    let base;
    if (p.kind === "person") base = p.personId ? ["you", p.personId] : [];
    else { const g = groups.find((x) => x.id === p.groupId); base = g ? ["you", ...g.memberIds] : []; }
    const extra = (p.extraInviteeIds || []).filter((id) => !base.includes(id));
    return [...base, ...extra];
  };
  const proposalTarget = (p) => {
    if (p.kind === "person") {
      const person = peopleById[p.personId];
      return person ? { name: person.name, color: person.color, isPerson: true, person } : null;
    }
    const g = groups.find((x) => x.id === p.groupId);
    return g ? { name: g.name, color: g.color, icon: g.shape, isPerson: false } : null;
  };
  const proposalConfirmed = (p) => {
    const participants = proposalParticipants(p);
    return participants.length > 0 && participants.every((id) => p.rsvps[id] === "yes");
  };

  const demoInviteSeeded = useRef(false);
  useEffect(() => {
    if (demoInviteSeeded.current) return;
    demoInviteSeeded.current = true;
    const demoDate = ALL_YEAR_KEYS[24] || ALL_YEAR_KEYS[0];
    const id = `weekend-crew-demo-${demoDate}`;
    setProposals((ps) => [...ps, {
      id,
      kind: "group",
      groupId: "weekend-crew",
      personId: null,
      dateKey: demoDate,
      endDateKey: demoDate,
      city: "Chicago, IL",
      title: `Weekend Crew · ${niceDateLabel(demoDate)}`,
      message: "Thinking we all fly into Chicago for a long weekend — I already checked flights and they're pretty cheap right now. Anyone free?",
      fromId: "jordan",
      rsvps: { jordan: "yes", maya: "yes", chris: "maybe" },
      thread: [
        { id: `${id}-t1`, personId: "maya", text: "I'm in! Just booked my flight." },
        { id: `${id}-t2`, personId: "chris", text: "Might have a work thing that weekend, will confirm by Friday." },
      ],
    }]);
  }, []);

  const upcomingByGroup = useMemo(() => {
    const result = {};
    for (const g of groups) {
      const hits = [];
      for (const key of ALL_YEAR_KEYS) if (groupFullyFree(g, key)) hits.push(key);
      result[g.id] = hits.slice(0, 6);
    }
    return result;
  }, [groups, availability]);

  // any proposal whose date range covers this day — powers the mini calendar dots + day detail panel
  const eventsOnDay = (iso) => proposals.filter((p) => iso >= p.dateKey && iso <= (p.endDateKey || p.dateKey));

  const TABS = [
    { id: "groups", label: "My Calendar", icon: CalendarDays },
    { id: "friends", label: "Friends Calendars", icon: Users },
    { id: "plans", label: "Plans", icon: PartyPopper, badge: anyUnreadPlans },
    { id: "messages", label: "Messages", icon: MessageCircle, badge: anyUnreadMessages },
  ];

  // ---- shared minimalist month-grid renderer (used in profile modals) ----
  const MonthGrid = ({ year, month, mode, personId, groupId, compact, onPick }) => {
    const cells = monthGridCells(year, month);
    const cellSize = compact ? 22 : 26;
    return (
      <div className="rounded-2xl px-4 py-4" style={{ background: "var(--ink-2)" }}>
        <h3 className="display text-sm mb-3 tracking-wide" style={{ color: "var(--paper)" }}>
          {MONTH_NAMES[month]} <span className="mono" style={{ color: "var(--mist)", fontSize: 11 }}>{year}</span>
        </h3>
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAY_LETTERS.map((l, i) => (<div key={i} className="mono text-center" style={{ color: "var(--mist)", fontSize: 9, opacity: 0.6 }}>{l}</div>))}
        </div>
        <div className="grid grid-cols-7 gap-x-1 gap-y-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = isoDate(d);
            const today = isToday(d);

            if (mode === "mine") {
              const status = getStatus(editingAsId, key);
              let bg = "transparent";
              let textColor = "var(--mist)";
              if (status === "free") { bg = editingAsPerson.color; textColor = "var(--on-accent)"; }
              else if (status === "tentative") { bg = tentativePattern(editingAsPerson.color); textColor = "var(--paper)"; }
              const ring = today ? `inset 0 0 0 1px ${editingAsPerson.color}` : "none";
              return (
                <div key={key} onMouseDown={() => handleMouseDown(key)} onMouseEnter={() => handleMouseEnter(key)} onClick={() => { setInspectedKey(key); setInspectedRangeEnd(null); }}
                  className="sync-daycell flex items-center justify-center mx-auto rounded-full"
                  style={{ width: cellSize, height: cellSize, background: bg, color: textColor, cursor: "pointer", boxShadow: ring }}
                  title={`${niceDateLabel(key)} · ${status || "not marked"} · click to invite`}>
                  <span className="mono" style={{ fontSize: 11 }}>{d.getDate()}</span>
                </div>
              );
            }

            if (mode === "person") {
              const person = peopleById[personId];
              const status = getStatus(personId, key);
              let bg = "transparent";
              let textColor = "var(--mist)";
              if (status === "free") { bg = person.color; textColor = "var(--on-accent)"; }
              else if (status === "tentative") { bg = tentativePattern(person.color); textColor = "var(--paper)"; }
              const ring = today ? `inset 0 0 0 1px ${person.color}` : "none";
              return (
                <div key={key}
                  onClick={() => onPick && onPick(key, key)}
                  className="sync-daycell flex items-center justify-center mx-auto rounded-full"
                  style={{ width: cellSize, height: cellSize, background: bg, color: textColor, boxShadow: ring, cursor: onPick ? "pointer" : "default" }}
                  title={`${niceDateLabel(key)} · ${status || "not marked"}`}>
                  <span className="mono" style={{ fontSize: 11 }}>{d.getDate()}</span>
                </div>
              );
            }

            if (mode === "group") {
              const g = groups.find((x) => x.id === groupId);
              const memberIds = g ? ["you", ...g.memberIds] : [];
              const memberPeople = memberIds.map((id) => peopleById[id]).filter(Boolean);
              const freeMembers = memberPeople.filter((p) => getStatus(p.id, key) === "free");
              const tentMembers = memberPeople.filter((p) => getStatus(p.id, key) === "tentative");
              const total = memberPeople.length || 1;
              const frac = freeMembers.length / total;
              const isFull = freeMembers.length === total;
              const cellDim = compact ? 26 : 30;
              const title = `${niceDateLabel(key)} · ${freeMembers.length}/${total} free` +
                (freeMembers.length ? ` (${freeMembers.map((p) => p.name).join(", ")})` : "") +
                (tentMembers.length ? ` · tentative: ${tentMembers.map((p) => p.name).join(", ")}` : "");
              return (
                <div key={key}
                  onClick={() => onPick && onPick(key, key)}
                  className="sync-daycell mx-auto flex flex-col items-center justify-center rounded-2xl"
                  style={{ width: cellDim, height: cellDim, cursor: onPick ? "pointer" : "default", background: isFull ? hexToRgba(g?.color || "#888", 0.3) : "transparent" }}
                  title={title}>
                  <span style={{ fontSize: compact ? 12 : 14, lineHeight: 1 }}>{moonPhaseEmoji(frac)}</span>
                  <span className="mono" style={{ fontSize: 9, marginTop: 1, color: today ? "var(--paper)" : "var(--mist)" }}>{d.getDate()}</span>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  };

  // ---- Fantastical-style mini month calendar with event-density dots ----
  const birthdayPeopleFor = (d) => {
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return people.filter((p) => p.birthday === key);
  };

  const MiniCalendar = () => {
    const cells = monthGridCells(calYear, calMonth);
    const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); setShowMonthBgPicker(false); };
    const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); setShowMonthBgPicker(false); };
    const monthKey = `${calYear}-${calMonth}`;
    const customBg = monthBackgrounds[monthKey];
    const theme = MONTH_THEMES[calMonth];
    return (
      <div className="rounded-3xl overflow-hidden relative" style={{ border: "1px solid var(--ink-3)" }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: customBg ? (customBg.startsWith("data:") ? `url(${customBg})` : customBg) : theme.grad, backgroundSize: "cover", backgroundPosition: "center" }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }} />
        {!customBg && <span className="absolute pointer-events-none" style={{ fontSize: 90, right: -14, bottom: -18, opacity: 0.16 }}>{theme.icon}</span>}

        <div className="relative p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} aria-label="Previous month" className="sync-icon-btn flex items-center justify-center rounded-full" style={{ width: 28, height: 28, color: "var(--paper)" }}>‹</button>
            <button onClick={() => setShowMonthBgPicker((s) => !s)} className="flex items-center gap-2">
              <p className="display text-lg" style={{ color: "var(--paper)" }}>{MONTH_NAMES_FULL[calMonth]} <span className="mono text-xs" style={{ color: "rgba(245,245,247,0.75)" }}>{calYear}</span></p>
              <Camera size={13} style={{ color: "rgba(245,245,247,0.75)" }} />
            </button>
            <button onClick={nextMonth} aria-label="Next month" className="sync-icon-btn flex items-center justify-center rounded-full" style={{ width: 28, height: 28, color: "var(--paper)" }}>›</button>
          </div>

          {showMonthBgPicker && (
            <div className="rounded-xl p-3 mb-4" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(245,245,247,0.15)" }}>
              <BackgroundPicker
                value={customBg || null}
                onChange={(bg) => setMonthBackgrounds((prev) => { const next = { ...prev }; if (bg) next[monthKey] = bg; else delete next[monthKey]; return next; })}
                label={`${MONTH_NAMES_FULL[calMonth]} background`}
              />
            </div>
          )}

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_LETTERS.map((l, i) => (<div key={i} className="mono text-center" style={{ color: "rgba(245,245,247,0.6)", fontSize: 10 }}>{l}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-y-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const iso = isoDate(d);
              const dayEvents = eventsOnDay(iso);
              const importedHits = importedEventsOnDay(iso);
              const today = isToday(d);
              const selected = iso === selectedDayIso;
              const holiday = holidayForDate(d);
              const birthdayPeople = birthdayPeopleFor(d);
              const dotColors = [
                ...dayEvents.slice(0, 3).map((p) => (proposalTarget(p) || {}).color || "var(--marigold)"),
                ...importedHits.slice(0, 3).map((h) => h.calColor),
              ].slice(0, 3);
              const totalCount = dayEvents.length + importedHits.length;
              return (
                <button key={iso} onClick={() => setSelectedDayIso(iso)}
                  className="sync-daycell flex flex-col items-center justify-center mx-auto rounded-2xl relative"
                  style={{
                    width: 36, height: 36,
                    background: selected ? "var(--marigold)" : "transparent",
                    boxShadow: !selected && today ? "inset 0 0 0 1px var(--marigold)" : "none",
                  }}>
                  {holiday && <span className="absolute" style={{ top: -3, left: -3, fontSize: 11 }} title={holiday.name}>{holiday.icon}</span>}
                  {birthdayPeople.length > 0 && <span className="absolute" style={{ top: -3, right: -3, fontSize: 11 }} title={`${birthdayPeople.map((p) => p.name).join(", ")}'s birthday`}>🎂</span>}
                  <span className="mono" style={{ fontSize: 12, color: selected ? "var(--on-accent)" : "var(--paper)" }}>{d.getDate()}</span>
                  <span style={{ display: "flex", gap: 2, height: 5, marginTop: 2, alignItems: "center" }}>
                    {dotColors.map((c, idx) => (<span key={idx} style={{ width: 4, height: 4, borderRadius: "50%", background: selected ? "var(--on-accent)" : c }} />))}
                    {totalCount > 3 && <span className="mono" style={{ fontSize: 7, color: selected ? "var(--on-accent)" : "rgba(245,245,247,0.7)" }}>+</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ---- selected-day detail panel with per-person avatars + imported events ----
  const DayDetail = () => {
    const dayEvents = eventsOnDay(selectedDayIso);
    const importedHits = importedEventsOnDay(selectedDayIso);
    return (
      <div className="rounded-3xl p-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)" }}>
        <p className="display text-lg mb-3" style={{ color: "var(--paper)" }}>{fullDateLabel(selectedDayIso)}{selectedDayIso === todayIso ? <span className="mono text-xs ml-2" style={{ color: "var(--marigold)" }}>today</span> : ""}</p>
        {dayEvents.length === 0 && importedHits.length === 0 ? (
          <div>
            <p className="text-sm mb-3" style={{ color: "var(--mist)" }}>Nothing planned yet.</p>
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {groups.slice(0, 3).map((g) => (
                  <button key={g.id} onClick={() => openInviteModal("group", g.id, selectedDayIso)} className="text-xs rounded-full px-3 py-1.5" style={{ border: "1px solid var(--ink-3)", color: "var(--paper)" }}>+ Invite {g.name}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((p) => {
              const target = proposalTarget(p);
              if (!target) return null;
              const participants = proposalParticipants(p);
              const confirmed = proposalConfirmed(p);
              return (
                <div key={p.id} onClick={() => setTab("plans")} className="sync-card rounded-2xl p-3 cursor-pointer" style={{ background: "var(--ink)", border: `1px solid ${confirmed ? "var(--mint)" : "var(--ink-3)"}` }}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p className="text-sm" style={{ color: "var(--paper)" }}>{p.title}</p>
                    <span className="mono text-xs whitespace-nowrap" style={{ color: "var(--mist)" }}>{p.time || "All day"}</span>
                  </div>
                  <div className="flex items-center -space-x-1.5">
                    {participants.slice(0, 6).map((pid) => {
                      const person = peopleById[pid];
                      if (!person) return null;
                      return <Avatar key={pid} person={person} size={22} ring="var(--ink)" />;
                    })}
                  </div>
                </div>
              );
            })}
            {importedHits.map((h) => (
              <div key={`${h.calId}-${h.id}`} className="rounded-2xl p-3" style={{ background: "var(--ink)", border: `1px solid ${h.calColor}55` }}>
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="text-sm" style={{ color: "var(--paper)" }}>{h.title}</p>
                  <span className="mono text-xs whitespace-nowrap" style={{ color: "var(--mist)" }}>{h.time || "All day"}</span>
                </div>
                <p className="mono text-xs flex items-center gap-1.5" style={{ color: h.calColor }}>
                  <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: h.calColor }} />
                  via {h.calName}{h.location ? ` · ${h.location}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ---- horizontal-scroll stack of upcoming plans (howbout/Partiful-style) ----
  const PlansStack = () => {
    const upcoming = [...proposals]
      .filter((p) => daysFromToday(p.endDateKey || p.dateKey) >= 0)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="display text-lg" style={{ color: "var(--paper)" }}>Up next</p>
          <button onClick={() => { setTab("friends"); setShowProposeForm(true); }} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>+ New plan</button>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--mist)" }}>No plans yet — pick a day above and invite a group or friend.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto sync-scroll pb-1" style={{ marginLeft: -4, paddingLeft: 4 }}>
            {upcoming.map((p) => {
              const target = proposalTarget(p);
              if (!target) return null;
              const participants = proposalParticipants(p);
              const confirmed = proposalConfirmed(p);
              const yesCount = participants.filter((id) => p.rsvps[id] === "yes").length;
              const [y, m, d] = p.dateKey.split("-").map(Number);
              const weekday = DAYS[(new Date(y, m - 1, d).getDay() + 6) % 7];
              return (
                <div key={p.id} onClick={() => setTab("plans")} className="sync-card rounded-3xl overflow-hidden cursor-pointer flex-shrink-0" style={{ width: 168, background: "var(--ink-2)", border: `1px solid ${confirmed ? "var(--mint)" : "var(--ink-3)"}` }}>
                  <div style={{ background: hexToRgba(target.color, 0.85), padding: "14px 16px" }}>
                    <p className="mono text-xs mb-1" style={{ color: "var(--on-accent)", opacity: 0.75 }}>{weekday.toUpperCase()}</p>
                    <p className="display" style={{ fontSize: 30, color: "var(--on-accent)", lineHeight: 1 }}>{d}</p>
                    <p className="mono text-xs" style={{ color: "var(--on-accent)", opacity: 0.75 }}>{MONTH_NAMES[m - 1]}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-sm mb-1" style={{ color: "var(--paper)" }}>{p.title}</p>
                    {p.city && <p className="mono text-xs mb-2 truncate" style={{ color: "var(--mist)" }}>{p.city}</p>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center -space-x-1.5">
                        {participants.slice(0, 4).map((pid) => {
                          const person = peopleById[pid];
                          if (!person) return null;
                          return <Avatar key={pid} person={person} size={20} ring="var(--ink-2)" />;
                        })}
                      </div>
                      {confirmed ? (
                        <span className="mono text-xs rounded-full px-2 py-1" style={{ background: "var(--mint)", color: "var(--on-accent)" }}>✓</span>
                      ) : (
                        <span className="mono text-xs" style={{ color: "var(--mist)" }}>{yesCount}/{participants.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // Onboarding — the brand mark shows up ONLY here, never in the main app
  // =========================================================================
  const OnboardingView = () => <IntroStory onDone={dismissOnboarding} />;

  return (
    <PhoneShell
      background={!showOnboarding ? appBackground : null}
      footer={!showOnboarding && <BottomTabBar tab={tab} setTab={setTab} tabs={TABS} />}
      themeMode={themeMode}
    >
      <div className={`sync-root theme-${themeMode} w-full h-full`}>
        <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          .sync-root { --ink:#000000; --ink-2:#1C1C1E; --ink-3:#2C2C2E; --ink-4:#3A3A3C; --paper:#F5F5F7; --marigold:#FF7A1A; --ember:#FF453A; --mint:#32D74B; --sun:#FF9F0A; --mist:#98989D; --rose:#FF375F; --on-accent:#FFFFFF; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing:antialiased; background:var(--ink); }
          .sync-root.theme-light { --ink:#F5F5F7; --ink-2:#FFFFFF; --ink-3:#E5E5EA; --ink-4:#D1D1D6; --paper:#1D1D1F; --mist:#6E6E73; }
          .sync-root .display { font-family:'Inter', -apple-system, sans-serif; font-weight:700; letter-spacing:-0.02em; }
          .sync-root .mono { font-family:'Inter', -apple-system, sans-serif; font-weight:500; letter-spacing:-0.01em; }
          .sync-cell { transition:background-color 120ms ease, transform 80ms ease; user-select:none; cursor:pointer; }
          .sync-cell:hover { transform:scale(1.05); }
          .sync-daycell { transition:background-color 120ms ease, transform 100ms ease; user-select:none; }
          .sync-daycell:hover { transform:scale(1.08); }
          .sync-tab { transition:color 150ms ease, border-color 150ms ease; font-weight:600; }
          .sync-chip { transition:background-color 150ms ease, color 150ms ease, border-color 150ms ease; cursor:pointer; }
          .sync-card { transition:transform 150ms ease, box-shadow 150ms ease; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
          .sync-card:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(0,0,0,0.12); }
          .sync-group-card { transition:box-shadow 150ms ease; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
          .sync-group-card:hover { box-shadow:0 8px 20px rgba(0,0,0,0.1); }
          .sync-toggle-btn { transition:background-color 150ms ease, color 150ms ease; }
          .sync-add-btn { transition:background-color 150ms ease, border-color 150ms ease, transform 150ms ease; }
          .sync-add-btn:hover { transform:scale(1.02); border-color:var(--marigold) !important; }
          .sync-swatch { transition:transform 120ms ease; cursor:pointer; }
          .sync-swatch:hover { transform:scale(1.12); }
          .sync-scroll::-webkit-scrollbar { height:6px; width:6px; }
          .sync-scroll::-webkit-scrollbar-thumb { background:var(--ink-3); border-radius:8px; }
          .sync-icon-btn { transition:background-color 150ms ease, transform 150ms ease; cursor:pointer; }
          .sync-icon-btn:hover { transform:scale(1.08); }
        `}} />

        {showOnboarding ? (
          <OnboardingView />
        ) : (
          <>
            <header className="px-5 pt-1 pb-3 flex items-center justify-between" style={{ position: "sticky", top: 0, zIndex: 25, background: "var(--ink)" }}>
              <p className="display text-2xl" style={{ color: "var(--paper)" }}>{TAB_TITLES[tab]}</p>
              <div className="flex items-center gap-2">
                {people.length > 1 && (
                  <button
                    onClick={() => { setFriendsView(groups[0]?.id || people.find((p) => p.id !== "you")?.id || "you"); setTab("friends"); }}
                    aria-label="Friends' calendars"
                    className="sync-icon-btn flex items-center justify-center rounded-full"
                    style={{ width: 34, height: 34, background: "var(--ink-2)", border: "1px solid var(--ink-3)", color: "var(--mist)" }}
                  >
                    <Users size={16} />
                  </button>
                )}
                <button
                  onClick={() => openPersonProfile("you")}
                  aria-label="Your profile"
                  className="sync-icon-btn flex items-center justify-center rounded-full"
                  style={{ width: 34, height: 34, border: "1px solid var(--ink-3)" }}
                >
                  <Avatar person={you} size={32} />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  aria-label="Settings"
                  className="sync-icon-btn flex items-center justify-center rounded-full"
                  style={{ width: 34, height: 34, background: "var(--ink-2)", border: "1px solid var(--ink-3)", color: "var(--mist)" }}
                >
                  <Settings size={16} />
                </button>
              </div>
            </header>

            {tab === "groups" && (
              <main className="px-5 pb-28">
                <div className="space-y-4 mb-6">
                  <MiniCalendar />
                  <DayDetail />
                </div>

                <PlansStack />

                {/* People + groups management — collapsed by default to keep the calendar front and center */}
                <section className="rounded-2xl mt-6 mb-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)" }}>
                  <button onClick={() => setShowManage((s) => !s)} className="w-full flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="mono text-xs" style={{ color: "var(--mist)" }}>people & groups</span>
                      <span className="mono text-xs" style={{ color: "var(--marigold)" }}>{people.length - 1} · {groups.length}</span>
                    </span>
                    <span className="flex items-center -space-x-1.5">
                      {people.filter((p) => p.id !== "you").slice(0, 5).map((p) => (
                        <Avatar key={p.id} person={p} size={20} ring="var(--ink-2)" />
                      ))}
                      <span className="mono text-xs ml-2" style={{ color: "var(--mist)" }}>{showManage ? "▲" : "▼"}</span>
                    </span>
                  </button>

                  {showManage && (
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between mb-2 pt-1">
                        <p className="mono text-xs" style={{ color: "var(--mist)" }}>people</p>
                        {people.length > 4 && (
                          <input value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} placeholder="Search..." className="text-xs rounded-full px-3 py-1 outline-none" style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)", width: 100 }} />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <div onClick={() => openPersonProfile("you")} className="sync-chip flex items-center gap-2 rounded-full pl-1 pr-3 py-1" style={{ border: "1px solid var(--marigold)" }}>
                          <Avatar person={you} size={20} />
                          <span className="text-sm" style={{ color: "var(--paper)" }}>You</span>
                          <span className="mono text-xs" style={{ color: "var(--marigold)" }}>edit profile</span>
                        </div>
                        {people.filter((p) => p.id !== "you" && p.name.toLowerCase().includes(peopleSearch.toLowerCase())).map((p) => (
                          <div key={p.id} onClick={() => openPersonProfile(p.id)} className="sync-chip flex items-center gap-2 rounded-full pl-1 pr-2 py-1" style={{ border: "1px solid var(--ink-3)" }}>
                            <Avatar person={p} size={20} />
                            <span className="text-sm" style={{ color: "var(--paper)" }}>{p.name}</span>
                            {groups.filter((g) => g.memberIds.includes(p.id)).map((g) => (
                              <span key={g.id} title={`In ${g.name}`} className="inline-block rounded-full" style={{ width: 8, height: 8, background: g.color, border: "1px solid var(--ink)" }} />
                            ))}
                            <button onClick={(e) => { e.stopPropagation(); seedPerson(p.id); }} className="sync-icon-btn text-xs" style={{ color: "var(--marigold)" }} title="Simulate calendar sync">⟳</button>
                            <button onClick={(e) => { e.stopPropagation(); removeFriend(p.id); }} className="text-xs ml-1" style={{ color: "var(--mist)" }} aria-label={`Remove ${p.name}`}>✕</button>
                          </div>
                        ))}
                        {!showAddFriend && (
                          <button onClick={() => setShowAddFriend(true)} className="sync-add-btn flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5" style={{ background: "transparent", border: "1px dashed var(--ink-3)", color: "var(--paper)" }}>
                            <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "var(--ink-3)", color: "var(--marigold)", fontSize: 13, lineHeight: 1 }}>+</span>
                            <span className="text-sm">Add friend</span>
                          </button>
                        )}
                      </div>
                      {showAddFriend && (
                        <div className="rounded-xl p-4 mb-4" style={{ background: "var(--ink)" }}>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFriend()} placeholder="Friend's name" autoFocus className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)", width: 140 }} />
                            <input value={newCity} onChange={(e) => setNewCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFriend()} placeholder="City" className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)", width: 120 }} />
                            <select value={newTz} onChange={(e) => setNewTz(Number(e.target.value))} className="text-sm rounded-full px-3 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}>
                              {TZ_OPTIONS.map((t) => (<option key={t.offset} value={t.offset}>{t.label}</option>))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs mono mr-1" style={{ color: "var(--mist)" }}>color</span>
                            {COLOR_PALETTE.map((c) => (<span key={c.hex} onClick={() => setNewColor(c.hex)} className="sync-swatch inline-block rounded-full" style={{ width: 20, height: 20, background: c.hex, boxShadow: newColor === c.hex ? `0 0 0 2px var(--ink), 0 0 0 4px ${c.hex}` : "none" }} />))}
                          </div>
                          <div className="mb-4">
                            <AvatarPicker person={{ name: newName || "?", color: newColor, avatarEmoji: newAvatarEmoji, avatarPhoto: newAvatarPhoto }} onChange={(patch) => { if ("avatarEmoji" in patch) setNewAvatarEmoji(patch.avatarEmoji); if ("avatarPhoto" in patch) setNewAvatarPhoto(patch.avatarPhoto); }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={addFriend} className="text-sm rounded-full px-4 py-2 display" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Add friend</button>
                            <button onClick={() => setShowAddFriend(false)} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                          </div>
                        </div>
                      )}

                      <p className="mono text-xs mb-2" style={{ color: "var(--mist)" }}>groups</p>
                      <div className="flex flex-col gap-2 mb-1">
                        {groups.map((g) => {
                          const daysThisMonth = ALL_YEAR_KEYS.filter((k) => groupFullyFree(g, k) && daysFromToday(k) >= 0 && daysFromToday(k) < 30).length;
                          return (
                          <div key={g.id} onClick={() => openGroupProfile(g.id)} className="sync-group-card sync-chip rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--ink)", border: `1px solid ${g.color}55` }}>
                            <span style={{ color: g.color, fontSize: 16 }}>{g.shape}</span>
                            <div className="flex-1">
                              <p className="text-sm" style={{ color: "var(--paper)" }}>{g.name}</p>
                              <p className="mono text-xs" style={{ color: "var(--mist)" }}>{g.memberIds.length + 1} people · {daysThisMonth > 0 ? <span style={{ color: g.color }}>{daysThisMonth} free day{daysThisMonth === 1 ? "" : "s"} this month</span> : "no free days yet"}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeGroup(g.id); }} className="text-xs ml-1" style={{ color: "var(--mist)" }} aria-label={`Remove ${g.name}`}>✕</button>
                          </div>
                        );})}
                        {!showGroupForm && (
                          <button onClick={() => { setShowGroupForm(true); setGroupFormError(""); }} className="sync-add-btn flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: "transparent", border: "1px dashed var(--ink-3)", color: "var(--paper)" }}>
                            <span className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: "var(--ink-3)", color: "var(--marigold)", fontSize: 13, lineHeight: 1 }}>+</span>
                            <span className="text-sm">New group</span>
                          </button>
                        )}
                      </div>
                      {showGroupForm && (
                        <div className="rounded-xl p-4 mt-3" style={{ background: "var(--ink)" }}>
                          <input value={newGroupName} onChange={(e) => { setNewGroupName(e.target.value); setGroupFormError(""); }} placeholder="Group name (e.g. Freshman Hall, Cousins)" className="text-sm rounded-full px-4 py-2 outline-none mb-3 w-full" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <span className="text-xs mono mr-1" style={{ color: "var(--mist)" }}>color</span>
                            {COLOR_PALETTE.map((c) => (<span key={c.hex} onClick={() => setNewGroupColor(c.hex)} className="sync-swatch inline-block rounded-full" style={{ width: 20, height: 20, background: c.hex, boxShadow: newGroupColor === c.hex ? `0 0 0 2px var(--ink), 0 0 0 4px ${c.hex}` : "none" }} />))}
                          </div>
                          <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>2+ members — one friend isn't a group, message them directly instead.</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {people.filter((p) => p.id !== "you").map((f) => {
                              const active = newGroupMembers.includes(f.id);
                              return (
                                <button key={f.id} onClick={() => toggleGroupMember(f.id)} className="sync-chip text-sm rounded-full px-3 py-1.5 flex items-center gap-2" style={{ background: active ? "var(--ink-3)" : "transparent", border: `1px solid ${active ? f.color : "var(--ink-3)"}`, color: "var(--paper)" }}>
                                  <Avatar person={f} size={16} />
                                  {f.name}
                                </button>
                              );
                            })}
                            {people.length <= 1 && <span className="text-sm" style={{ color: "var(--mist)" }}>Add a friend above first.</span>}
                          </div>
                          {groupFormError && <p className="text-xs mono mb-3" style={{ color: "var(--ember)" }}>{groupFormError}</p>}
                          <div className="flex items-center gap-2">
                            <button onClick={createGroup} className="text-sm rounded-full px-4 py-2 display" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>
                              Create group
                            </button>
                            <button onClick={() => { setShowGroupForm(false); setNewGroupMembers([]); setGroupFormError(""); }} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

              </main>
            )}

            {tab === "friends" && (() => {
              const friendsViewId = friendsView || groups[0]?.id || people.find((p) => p.id !== "you")?.id || "you";
              const viewingGroup = groups.find((g) => g.id === friendsViewId) || null;
              const viewingPerson = !viewingGroup ? (peopleById[friendsViewId] || you) : null;
              const weekMode = viewingGroup ? "group" : (friendsViewId === "you" ? "mine" : "person");
              const weekColor = viewingGroup ? viewingGroup.color : weekMode === "mine" ? editingAsPerson.color : viewingPerson.color;
              const mondayOfThisWeek = (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; })();

              return (
              <main className="px-5 pb-28">
                <p className="text-xs mb-4" style={{ color: "var(--mist)" }}>See how your availability lines up with everyone else's, then turn a shared free day into a plan.</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {groups.map((g) => (
                    <button key={g.id} onClick={() => setFriendsView(g.id)} className="sync-chip text-sm rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ background: friendsViewId === g.id ? g.color : "transparent", color: friendsViewId === g.id ? "var(--on-accent)" : "var(--paper)", border: `1px solid ${friendsViewId === g.id ? g.color : "var(--ink-3)"}` }}>
                      <span>{g.shape}</span>{g.name}
                    </button>
                  ))}
                  {people.filter((p) => p.id !== "you").map((p) => (
                    <button key={p.id} onClick={() => setFriendsView(p.id)} className="sync-chip text-sm rounded-full pl-1 pr-3 py-1 flex items-center gap-1.5" style={{ background: friendsViewId === p.id ? p.color : "transparent", color: friendsViewId === p.id ? "var(--on-accent)" : "var(--paper)", border: `1px solid ${friendsViewId === p.id ? p.color : "var(--ink-3)"}` }}>
                      <Avatar person={p} size={18} />{p.name}
                    </button>
                  ))}
                  <button onClick={() => setFriendsView("you")} className="sync-chip text-sm rounded-full px-3 py-1.5" style={{ background: friendsViewId === "you" ? "var(--marigold)" : "transparent", color: friendsViewId === "you" ? "var(--on-accent)" : "var(--paper)", border: `1px solid ${friendsViewId === "you" ? "var(--marigold)" : "var(--ink-3)"}` }}>You</button>
                </div>

                {/* Horizon */}
                <p className="display text-lg mb-3" style={{ color: "var(--paper)" }}>
                  {weekMode === "mine" ? "Mark your availability" : weekMode === "group" ? `${viewingGroup.name}'s availability` : `${viewingPerson.name}'s availability`}
                </p>
                <div className="flex items-center gap-1 mb-3 w-fit rounded-full p-1" style={{ background: "var(--ink-2)" }}>
                  <button onClick={() => setHorizon("week")} className="sync-toggle-btn text-sm rounded-full px-4 py-1.5" style={{ background: horizon === "week" ? "var(--marigold)" : "transparent", color: horizon === "week" ? "var(--on-accent)" : "var(--mist)" }}>This Week</button>
                  <button onClick={() => setHorizon("year")} className="sync-toggle-btn text-sm rounded-full px-4 py-1.5" style={{ background: horizon === "year" ? "var(--marigold)" : "transparent", color: horizon === "year" ? "var(--on-accent)" : "var(--mist)" }}>Next 12 Months</button>
                </div>

                <div className="flex items-center gap-3 mb-3 flex-wrap text-xs mono" style={{ color: "var(--mist)" }}>
                  {weekMode === "group" ? (
                    <>
                      <span className="flex items-center gap-1">{moonPhaseEmoji(0)} nobody free</span>
                      <span className="flex items-center gap-1">{moonPhaseEmoji(0.5)} half free</span>
                      <span className="flex items-center gap-1">{moonPhaseEmoji(1)} everyone free</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1"><span className="inline-block rounded-full" style={{ width: 10, height: 10, border: "1px solid var(--ink-3)" }} />not marked</span>
                      <span className="flex items-center gap-1"><span className="inline-block rounded-full" style={{ width: 10, height: 10, background: weekColor }} />free</span>
                      <span className="flex items-center gap-1"><span className="inline-block rounded-full" style={{ width: 10, height: 10, background: tentativePattern(weekColor), border: `1px solid ${weekColor}` }} />tentative</span>
                    </>
                  )}
                  {weekMode !== "mine" && <span>· not editable — switch to "You" to mark your own</span>}
                </div>

                {horizon === "week" ? (
                  <section className="rounded-2xl p-3 overflow-x-auto sync-scroll" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)" }}>
                    <div style={{ minWidth: 640 }}>
                      <div className="grid mb-2" style={{ gridTemplateColumns: `40px repeat(7, 1fr)` }}>
                        <div />
                        {DAYS.map((day, di) => {
                          const date = new Date(mondayOfThisWeek);
                          date.setDate(date.getDate() + di);
                          const today = isToday(date);
                          let dayFrac = null;
                          if (weekMode === "group") {
                            const memberIds = ["you", ...viewingGroup.memberIds];
                            const fracs = HOURS.map((hour) => memberIds.filter((id) => getStatus(id, `${day}-${hour}`) === "free").length / memberIds.length);
                            dayFrac = fracs.reduce((a, b) => a + b, 0) / fracs.length;
                          }
                          return (
                            <div key={day} className="flex flex-col items-center gap-0.5">
                              <span className="mono" style={{ fontSize: 9, color: today ? "var(--marigold)" : "var(--mist)" }}>{day.toUpperCase()}</span>
                              <span className="mono flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: today ? "var(--marigold)" : "transparent", color: today ? "var(--on-accent)" : "var(--paper)", fontSize: 12 }}>{date.getDate()}</span>
                              {dayFrac !== null && <span style={{ fontSize: 11 }} title={`${Math.round(dayFrac * 100)}% free on average`}>{moonPhaseEmoji(dayFrac)}</span>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="grid" style={{ gridTemplateColumns: `40px repeat(7, 1fr)` }}>
                        <div>
                          {HOURS.map((hour) => (<div key={hour} className="mono text-xs text-right pr-2" style={{ height: 28, color: "var(--mist)" }}>{hourLabel(hour)}</div>))}
                        </div>
                        {DAYS.map((day) => {
                          const getVal = (hour) => {
                            if (weekMode === "group") {
                              const memberIds = ["you", ...viewingGroup.memberIds];
                              const free = memberIds.filter((id) => getStatus(id, `${day}-${hour}`) === "free").length;
                              return Math.round((free / memberIds.length) * 8) / 8;
                            }
                            const targetId = weekMode === "mine" ? editingAsId : viewingPerson.id;
                            return getStatus(targetId, `${day}-${hour}`) || null;
                          };
                          const runs = [];
                          let cur = null;
                          HOURS.forEach((hour, idx) => {
                            const val = getVal(hour);
                            const k = JSON.stringify(val);
                            if (cur && cur.k === k) cur.len++;
                            else { if (cur) runs.push(cur); cur = { k, val, start: idx, len: 1 }; }
                          });
                          if (cur) runs.push(cur);
                          return (
                            <div key={day} className="relative" style={{ height: 28 * HOURS.length }}>
                              {HOURS.map((hour, idx) => (<div key={hour} style={{ position: "absolute", top: idx * 28, left: 0, right: 0, height: 28, borderTop: "1px solid var(--ink-3)" }} />))}
                              {weekMode === "mine" && HOURS.map((hour, idx) => (
                                <div key={hour} onMouseDown={() => handleMouseDown(`${day}-${hour}`)} onMouseEnter={() => handleMouseEnter(`${day}-${hour}`)} style={{ position: "absolute", top: idx * 28, left: 1, right: 1, height: 28, cursor: "pointer", zIndex: 2 }} />
                              ))}
                              {runs.map((run, ri) => {
                                if (!run.val) return null;
                                const bg = weekMode === "group" ? hexToRgba(weekColor, 0.2 + run.val * 0.7) : run.val === "free" ? weekColor : tentativePattern(weekColor);
                                const label = weekMode !== "group" && run.len >= 2 ? (run.val === "free" ? "Free" : "Tentative") : null;
                                return (
                                  <div key={ri} style={{ position: "absolute", top: run.start * 28 + 1, left: 2, right: 2, height: run.len * 28 - 2, background: bg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 1 }}>
                                    {label && <span className="mono" style={{ fontSize: 9, color: "var(--on-accent)" }}>{label}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="grid grid-cols-1 gap-3">
                    {months.map(({ year, month }) => (
                      <MonthGrid key={`${year}-${month}`} year={year} month={month} mode={weekMode} personId={weekMode === "person" ? viewingPerson.id : undefined} groupId={weekMode === "group" ? viewingGroup.id : undefined} />
                    ))}
                  </section>
                )}

                {/* Suggestions + propose */}
                {groups.length > 0 && (
                  <section className="mt-6 space-y-4">
                    {groups.map((g) => (
                      <div key={g.id}>
                        <h2 className="display text-base mb-2 flex items-center gap-2" style={{ color: "var(--paper)" }}>
                          <span style={{ color: g.color, fontSize: 14 }}>{g.shape}</span>{g.name}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {(upcomingByGroup[g.id] || []).length === 0 ? (
                            <span className="text-sm" style={{ color: "var(--mist)" }}>No shared free days yet — mark more above, or sync a friend's calendar in Manage people.</span>
                          ) : (
                            upcomingByGroup[g.id].map((key, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 rounded-full pl-3 pr-1 py-1" style={{ background: hexToRgba(g.color, 0.85) }}>
                                <span className="mono text-xs" style={{ color: "var(--on-accent)" }}>{niceDateLabel(key)}</span>
                                <button onClick={() => openInviteModal("group", g.id, key)} className="mono text-xs rounded-full px-2 py-0.5" style={{ background: "var(--ink)", color: g.color }} title="Turn into an invitation">propose</button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Manual propose form */}
                <section ref={proposeFormRef} className="mt-6 rounded-2xl p-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)", scrollMarginTop: 90 }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="display text-base" style={{ color: "var(--paper)" }}>Propose a date manually</p>
                    {!showProposeForm && (
                      <button onClick={() => setShowProposeForm(true)} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>+ Propose</button>
                    )}
                  </div>
                  {showProposeForm && (
                    <div className="rounded-xl p-4 mb-4" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <input type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                        <select value={proposeGroupId} onChange={(e) => setProposeGroupId(e.target.value)} className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}>
                          <option value="">Choose a group</option>
                          {groups.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                        </select>
                        <input value={proposeCity} onChange={(e) => setProposeCity(e.target.value)} placeholder="City (optional)" className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)", width: 140 }} />
                        <select value={proposeTime} onChange={(e) => setProposeTime(e.target.value)} className="text-sm rounded-full px-4 py-2 outline-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)", width: 130 }}>
                          <option value="">Time (optional)</option>
                          {TIME_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                        </select>
                      </div>
                      <input value={proposeTitle} onChange={(e) => setProposeTitle(e.target.value)} placeholder="Name this invitation" className="text-sm rounded-lg px-4 py-2 outline-none w-full mb-2" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                      <textarea value={proposeMessage} onChange={(e) => setProposeMessage(e.target.value)} placeholder="Message (optional)" rows={3} className="text-sm rounded-lg px-4 py-2 outline-none w-full mb-3 resize-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                      <div className="flex items-center gap-2">
                        <button onClick={() => { createProposal("group", proposeGroupId, proposeDate, proposeTitle, proposeMessage, proposeCity, null, proposeTime); setShowProposeForm(false); setProposeDate(""); setProposeGroupId(""); setProposeCity(""); setProposeTitle(""); setProposeMessage(""); setProposeTime(""); }} className="text-sm rounded-full px-4 py-2 display" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Create</button>
                        <button onClick={() => setShowProposeForm(false)} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <p className="text-sm" style={{ color: "var(--mist)" }}>Your full list of plans lives on the Plans tab.</p>
                </section>
              </main>
              );
            })()}

            {tab === "plans" && (
              <main className="px-5 pb-28">
                <p className="text-xs mb-4" style={{ color: "var(--mist)" }}>View details, RSVP, edit, or invite more people here — chat about a plan on Messages.</p>

                <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-1 w-fit rounded-full p-1" style={{ background: "var(--ink-2)" }}>
                    <button onClick={() => setPlansFilter("upcoming")} className="sync-toggle-btn text-sm rounded-full px-4 py-1.5" style={{ background: plansFilter === "upcoming" ? "var(--marigold)" : "transparent", color: plansFilter === "upcoming" ? "var(--on-accent)" : "var(--mist)" }}>Upcoming</button>
                    <button onClick={() => setPlansFilter("past")} className="sync-toggle-btn text-sm rounded-full px-4 py-1.5" style={{ background: plansFilter === "past" ? "var(--marigold)" : "transparent", color: plansFilter === "past" ? "var(--on-accent)" : "var(--mist)" }}>Past</button>
                  </div>
                  {plansFilter === "past" && (
                    <input value={pastPlansSearch} onChange={(e) => setPastPlansSearch(e.target.value)} placeholder="Search past plans..." className="text-sm rounded-full px-4 py-1.5 outline-none w-full" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                  )}
                </div>

                {(() => {
                  const visible = [...proposals].reverse().filter((p) => {
                    const past = daysFromToday(p.endDateKey || p.dateKey) < 0;
                    if (plansFilter === "past") {
                      if (!past) return false;
                      const target = proposalTarget(p);
                      const q = pastPlansSearch.toLowerCase();
                      return !q || p.title.toLowerCase().includes(q) || (target && target.name.toLowerCase().includes(q));
                    }
                    return !past;
                  });
                  if (visible.length === 0) {
                    return (
                      <p className="text-sm" style={{ color: "var(--mist)" }}>
                        {plansFilter === "past" ? "No past plans yet." : "No upcoming plans. Head to the Calendar tab, tap a date, and invite a group or person to create one."}
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-5">
                      {visible.map((p) => {
                        const target = proposalTarget(p);
                        if (!target) return null;
                        const participants = proposalParticipants(p);
                        const confirmed = proposalConfirmed(p);
                        const isPast = daysFromToday(p.endDateKey || p.dateKey) < 0;
                        const youAttended = p.rsvps["you"] === "yes";
                        const sortedParticipants = [...participants].sort((a, b) => {
                          const order = { yes: 0, maybe: 1 };
                          const sa = order[p.rsvps[a]] ?? 2;
                          const sb = order[p.rsvps[b]] ?? 2;
                          return sa - sb;
                        });
                        const fromPerson = peopleById[p.fromId] || you;
                        const isEditing = editingProposalId === p.id;
                        const invitable = people.filter((per) => per.id !== "you" && !participants.includes(per.id));
                        return (
                          <div key={p.id} className="rounded-2xl p-4" style={{ background: "var(--ink-2)", border: `1px solid ${confirmed ? "var(--mint)" : "var(--ink-3)"}`, opacity: isPast ? 0.85 : 1 }}>
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                {target.isPerson ? (
                                  <Avatar person={target.person} size={26} />
                                ) : (
                                  <span style={{ color: target.color, fontSize: 16 }}>{target.icon}</span>
                                )}
                                <div>
                                  {isEditing ? (
                                    <input value={editDraft.title} onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))} className="text-sm rounded-lg px-2 py-1 outline-none mb-1" style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                                  ) : (
                                    <p className="display text-base" style={{ color: "var(--paper)" }}>{p.title}</p>
                                  )}
                                  <p className="mono text-xs flex items-center gap-1.5 flex-wrap" style={{ color: "var(--mist)" }}>
                                    <span>{target.name} · {rangeLabel(p.dateKey, p.endDateKey || p.dateKey)}{p.time ? ` · ${p.time} (${fromPerson.name}'s time)` : ""}{p.city && !isEditing ? ` · ${p.city}` : ""}</span>
                                    {p.seriesLabel && <span className="rounded-full px-2 py-0.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>{p.seriesLabel}</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isPast ? (
                                  <span className="mono text-xs rounded-full px-3 py-1" style={{ background: "var(--ink-3)", color: "var(--mist)" }}>{youAttended ? "you were there" : "you didn't attend"}</span>
                                ) : confirmed ? (
                                  <span className="mono text-xs rounded-full px-3 py-1" style={{ background: "var(--mint)", color: "var(--on-accent)" }}>✓ Locked in</span>
                                ) : (
                                  <span className="mono text-xs" style={{ color: "var(--mist)" }}>{participants.filter((id) => p.rsvps[id] === "yes").length}/{participants.length} confirmed</span>
                                )}
                                <button onClick={() => requestDeleteProposal(p.id)} className="text-xs" style={{ color: "var(--mist)" }}>✕</button>
                              </div>
                            </div>

                            {/* Opening invite message */}
                            {isEditing ? (
                              <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "var(--ink)", border: `1px solid ${fromPerson.color}55` }}>
                                <textarea value={editDraft.message} onChange={(e) => setEditDraft((d) => ({ ...d, message: e.target.value }))} rows={3} className="text-sm rounded-lg px-2 py-1 outline-none w-full mb-2 resize-none" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                                <input value={editDraft.city} onChange={(e) => setEditDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Location (optional)" className="text-sm rounded-lg px-2 py-1 outline-none w-full mb-2" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                                <input value={editDraft.time} onChange={(e) => setEditDraft((d) => ({ ...d, time: e.target.value }))} placeholder="Time (optional)" className="text-sm rounded-lg px-2 py-1 outline-none w-full" style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                              </div>
                            ) : (
                              <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "var(--ink)", border: `1px solid ${fromPerson.color}55` }}>
                                <p className="text-xs mono mb-1" style={{ color: fromPerson.color }}>{fromPerson.name} invited {target.isPerson ? "you" : "the group"}</p>
                                <p className="text-sm" style={{ color: "var(--paper)" }}>{p.message || "(no message)"}</p>
                              </div>
                            )}

                            {/* Participants, free first then tentative then not-free */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {sortedParticipants.map((pid) => {
                                const person = peopleById[pid];
                                const status = p.rsvps[pid];
                                const dot = status === "yes" ? "var(--mint)" : status === "maybe" ? "var(--sun)" : status === "no" ? "var(--ember)" : "var(--ink-3)";
                                const tzDiff = person.tz - fromPerson.tz;
                                return (
                                  <span key={pid} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1" style={{ border: `1px solid ${dot}` }}>
                                    <Avatar person={person} size={16} />
                                    <span className="text-xs" style={{ color: "var(--paper)" }}>{person.name}</span>
                                    {p.time && tzDiff !== 0 && <span className="mono text-xs" style={{ color: "var(--mist)" }}>{tzDiff > 0 ? "+" : ""}{tzDiff}h</span>}
                                    <span className="mono text-xs" style={{ color: dot }}>{status || "no response"}</span>
                                  </span>
                                );
                              })}
                            </div>

                            {!isPast && (
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <span className="text-xs mono" style={{ color: "var(--mist)" }}>Responding as {editingAsPerson.name}:</span>
                                {["yes", "maybe", "no"].map((s) => (
                                  <button key={s} onClick={() => setRsvp(p.id, editingAsId, s)} className="text-xs rounded-full px-3 py-1" style={{ background: p.rsvps[editingAsId] === s ? "var(--marigold)" : "var(--ink)", color: p.rsvps[editingAsId] === s ? "var(--on-accent)" : "var(--mist)", border: "1px solid var(--ink-3)" }}>
                                    {s === "yes" ? "I'm in" : s === "maybe" ? "Maybe" : "Can't make it"}
                                  </button>
                                ))}
                              </div>
                            )}

                            {inviteMoreForId === p.id && (
                              <div className="rounded-xl p-3 mb-3" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                                <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>invite more people to this plan</p>
                                <div className="flex flex-wrap gap-2">
                                  {invitable.length === 0 ? (
                                    <span className="text-sm" style={{ color: "var(--mist)" }}>Everyone you know is already on this plan.</span>
                                  ) : invitable.map((per) => (
                                    <button key={per.id} onClick={() => addInviteeToProposal(p.id, per.id)} className="text-sm rounded-full px-3 py-1.5 flex items-center gap-2" style={{ border: `1px solid ${per.color}`, color: "var(--paper)" }}>
                                      <Avatar person={per} size={16} />
                                      {per.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap">
                              {isEditing ? (
                                <>
                                  <button onClick={saveEditProposal} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Save</button>
                                  <button onClick={() => setEditingProposalId(null)} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>Cancel</button>
                                </>
                              ) : (
                                <>
                                  {!isPast && <button onClick={() => startEditProposal(p)} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>Edit plan</button>}
                                  {!isPast && <button onClick={() => setInviteMoreForId(inviteMoreForId === p.id ? null : p.id)} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>{inviteMoreForId === p.id ? "Close" : "+ Invite more"}</button>}
                                  <button onClick={() => downloadICS(p, target.name)} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>Add to calendar (.ics)</button>
                                  <button onClick={() => setTab("messages")} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>Open conversation →</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </main>
            )}

            {tab === "messages" && (
              <main className="px-5 pb-28">
                <section className="rounded-2xl p-4 mb-4" style={{ background: "var(--ink-2)", border: "1px solid var(--ink-3)" }}>
                  <p className="mono text-xs mb-3" style={{ color: "var(--mist)" }}>tap someone to see their availability & message them</p>
                  <div className="flex flex-wrap gap-4">
                    {groups.map((g) => (
                      <button key={g.id} onClick={() => openGroupProfile(g.id)} className="sync-icon-btn flex flex-col items-center gap-1" style={{ background: "transparent" }}>
                        <span className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: hexToRgba(g.color, 0.25), border: `1.5px solid ${g.color}`, color: g.color, fontSize: 16 }}>{g.shape}</span>
                        <span className="text-xs mono" style={{ color: "var(--mist)" }}>{g.name}</span>
                      </button>
                    ))}
                    {people.filter((p) => p.id !== "you").map((p) => (
                      <button key={p.id} onClick={() => openPersonProfile(p.id)} className="sync-icon-btn flex flex-col items-center gap-1" style={{ background: "transparent" }}>
                        <Avatar person={p} size={40} />
                        <span className="text-xs mono" style={{ color: "var(--mist)" }}>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                <p className="text-xs mb-5" style={{ color: "var(--mist)" }}>RSVPs & plan details live on Plans — this is just for chatting.</p>

                {proposals.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--mist)" }}>No conversations yet. Head to the Calendar tab, tap a date, and invite a group or person to start one.</p>
                ) : (
                  <div className="space-y-5">
                    {[...proposals].reverse().map((p) => {
                      const target = proposalTarget(p);
                      if (!target) return null;
                      const fromPerson = peopleById[p.fromId] || you;
                      const unread = hasUnreadThread(p);
                      return (
                        <div key={p.id} className="rounded-2xl p-4" style={{ background: "var(--ink-2)", border: `1px solid ${unread ? "var(--sun)" : "var(--ink-3)"}` }}>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              {target.isPerson ? (
                                <Avatar person={target.person} size={26} />
                              ) : (
                                <span style={{ color: target.color, fontSize: 16 }}>{target.icon}</span>
                              )}
                              <div>
                                <p className="display text-base flex items-center gap-2" style={{ color: "var(--paper)" }}>
                                  {p.title}
                                  {unread && <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: "var(--sun)" }} />}
                                </p>
                                <p className="mono text-xs" style={{ color: "var(--mist)" }}>{target.name} · {rangeLabel(p.dateKey, p.endDateKey || p.dateKey)}{p.time ? ` · ${p.time} (${fromPerson.name}'s time)` : ""}</p>
                              </div>
                            </div>
                            {p.seriesLabel && <span className="mono text-xs rounded-full px-2 py-0.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>{p.seriesLabel}</span>}
                          </div>

                          {/* Opening invite message */}
                          <div className="rounded-xl px-4 py-3 mb-3" style={{ background: "var(--ink)", border: `1px solid ${fromPerson.color}55` }}>
                            <p className="text-xs mono mb-1" style={{ color: fromPerson.color }}>{fromPerson.name} invited {target.isPerson ? "you" : "the group"}</p>
                            <p className="text-sm" style={{ color: "var(--paper)" }}>{p.message || "(no message)"}</p>
                          </div>

                          {/* Reply thread */}
                          {p.thread.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {p.thread.map((m) => {
                                const sender = peopleById[m.personId] || you;
                                return (
                                  <div key={m.id} className="rounded-xl px-4 py-2" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                                    <p className="text-xs mono mb-0.5" style={{ color: sender.color }}>{sender.name}</p>
                                    <p className="text-sm" style={{ color: "var(--paper)" }}>{m.text}</p>
                                    <MessageReactions message={m} onToggle={(emoji) => toggleThreadReaction(p.id, m.id, emoji)} />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              value={replyDrafts[p.id] || ""}
                              onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") { addReply(p.id, editingAsId, replyDrafts[p.id] || ""); setReplyDrafts((prev) => ({ ...prev, [p.id]: "" })); } }}
                              placeholder={`Reply as ${editingAsPerson.name}...`}
                              className="text-sm rounded-full px-4 py-2 outline-none flex-1"
                              style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                            />
                            <button
                              onClick={() => { addReply(p.id, editingAsId, replyDrafts[p.id] || ""); setReplyDrafts((prev) => ({ ...prev, [p.id]: "" })); }}
                              className="text-sm rounded-full px-4 py-2"
                              style={{ background: "var(--marigold)", color: "var(--on-accent)" }}
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </main>
            )}

            {/* ---- Settings sheet ---- */}
            {showSettings && (
              <div className="absolute inset-0 z-40 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setShowSettings(false)}>
                <div onClick={(e) => e.stopPropagation()} className="sync-scroll" style={{ maxHeight: "85%", overflowY: "auto", background: "var(--ink-2)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--ink-4)", padding: "20px 20px 32px", boxShadow: "0 -20px 45px rgba(0,0,0,0.4)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <p className="display text-xl" style={{ color: "var(--paper)" }}>Settings</p>
                    <button onClick={() => setShowSettings(false)} className="text-xs" style={{ color: "var(--mist)" }}>✕ close</button>
                  </div>

                  <p className="mono text-xs mb-2" style={{ color: "var(--mist)" }}>appearance</p>
                  <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setThemeMode("dark")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm flex-1 justify-center" style={{ background: themeMode === "dark" ? "var(--ink-3)" : "var(--ink)", color: "var(--paper)" }}><Moon size={15} /> Dark</button>
                    <button onClick={() => setThemeMode("light")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm flex-1 justify-center" style={{ background: themeMode === "light" ? "var(--ink-3)" : "var(--ink)", color: "var(--paper)" }}><Sun size={15} /> Light</button>
                  </div>

                  <div className="mb-6">
                    <BackgroundPicker value={appBackground} onChange={setAppBackground} label="Wallpaper" />
                  </div>

                  <p className="mono text-xs mb-2" style={{ color: "var(--mist)" }}>calendars</p>
                  <button onClick={() => setShowImportModal(true)} className="sync-add-btn w-full text-sm rounded-xl px-4 py-3 mb-2 flex items-center justify-center gap-2" style={{ background: "var(--ink)", border: "1px dashed var(--ink-3)", color: "var(--paper)" }}>+ Import a calendar</button>
                  {importedCalendars.length > 0 && (
                    <div className="space-y-2 mb-6 mt-2">
                      {importedCalendars.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "var(--ink)", border: `1px solid ${c.color}55` }}>
                          <span className="flex items-center gap-2 text-sm" style={{ color: "var(--paper)" }}>
                            <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: c.color }} />
                            {c.name} <span className="mono text-xs" style={{ color: "var(--mist)" }}>· {c.events.length} events</span>
                          </span>
                          <button onClick={() => removeImportedCalendar(c.id)} className="text-xs" style={{ color: "var(--mist)" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => { setShowOnboarding(true); setSlideIndex(0); setShowSettings(false); }}
                    className="w-full text-left rounded-lg px-1 py-2 text-sm mt-2"
                    style={{ color: "var(--mist)" }}
                  >
                    Replay intro
                  </button>
                </div>
              </div>
            )}

            {/* ---- Import calendar modal ---- */}
            {showImportModal && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowImportModal(false)}>
                <div onClick={(e) => e.stopPropagation()} className="sync-scroll" style={{ maxHeight: "85%", overflowY: "auto", background: "var(--ink-2)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--ink-4)", padding: 20 }}>
                  <p className="display text-lg mb-1" style={{ color: "var(--paper)" }}>Import a calendar</p>
                  <p className="text-xs mono mb-4" style={{ color: "var(--mist)" }}>Export a calendar as .ics from Google, Apple, or Outlook, then upload or paste it below — its events will show up alongside your plans.</p>
                  <input value={importName} onChange={(e) => setImportName(e.target.value)} placeholder="Name this calendar (e.g. Work)" className="text-sm rounded-lg px-3 py-2 outline-none w-full mb-3" style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                  <label className="text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 mb-3" style={{ background: "var(--ink-3)", color: "var(--paper)", cursor: "pointer" }}>
                    Upload .ics file
                    <input type="file" accept=".ics,text/calendar" onChange={handleImportFile} className="hidden" />
                  </label>
                  <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="...or paste the .ics file contents here" rows={6} className="text-xs mono rounded-lg px-3 py-2 outline-none w-full mb-3 resize-none" style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }} />
                  {importError && <p className="text-xs mb-3" style={{ color: "var(--ember)" }}>{importError}</p>}
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setShowImportModal(false); setImportError(""); }} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                    <button onClick={importCalendar} className="text-sm rounded-full px-5 py-2 display" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Import</button>
                  </div>
                </div>
              </div>
            )}

            {inspectedKey && (
              <div
                style={{
                  position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                  width: "92%", maxHeight: "70%", overflowY: "auto",
                  zIndex: 45,
                  background: "var(--ink-2)", border: "1px solid var(--ink-4)",
                  boxShadow: "0 20px 45px rgba(0,0,0,0.5)",
                }}
                className="rounded-2xl p-4 sync-scroll"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <p className="display text-base" style={{ color: "var(--paper)" }}>{rangeLabel(inspectedKey, inspectedRangeEnd || inspectedKey)}</p>
                  <button onClick={() => { setInspectedKey(null); setInspectedRangeEnd(null); }} className="text-xs" style={{ color: "var(--mist)" }}>✕ close</button>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {[...people].sort((a, b) => {
                    const order = { free: 0, tentative: 1 };
                    const sa = order[getStatus(a.id, inspectedKey)] ?? 2;
                    const sb = order[getStatus(b.id, inspectedKey)] ?? 2;
                    return sa - sb;
                  }).map((p) => {
                    const status = getStatus(p.id, inspectedKey);
                    const label = status === "free" ? "free" : status === "tentative" ? "tentative" : "not marked";
                    return (
                      <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1" style={{ border: `1px solid ${p.color}` }}>
                        <Avatar person={p} size={18} />
                        <span className="text-xs" style={{ color: "var(--paper)" }}>{p.name}</span>
                        <span className="mono text-xs" style={{ color: p.color, opacity: 0.85 }}>{label}</span>
                      </span>
                    );
                  })}
                </div>

                <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>invite a group to plan this day</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {groups.length === 0 && <span className="text-sm" style={{ color: "var(--mist)" }}>No groups yet.</span>}
                  {[...groups].sort((a, b) => {
                    const freeCount = (grp) => ["you", ...grp.memberIds].filter((id) => getStatus(id, inspectedKey) === "free").length;
                    return freeCount(b) - freeCount(a);
                  }).map((g) => {
                    const fullMatch = groupFullyFree(g, inspectedKey);
                    const already = proposalExists("group", g.id, inspectedKey);
                    return (
                      <button
                        key={g.id}
                        disabled={already}
                        onClick={() => openInviteModal("group", g.id, inspectedKey, inspectedRangeEnd)}
                        className="text-sm rounded-full px-4 py-1.5 flex items-center gap-2"
                        style={{
                          background: already ? "var(--ink-3)" : fullMatch ? g.color : "transparent",
                          color: already ? "var(--mist)" : fullMatch ? "var(--on-accent)" : "var(--paper)",
                          border: `1px solid ${fullMatch ? g.color : "var(--ink-3)"}`,
                          cursor: already ? "default" : "pointer",
                        }}
                      >
                        <span>{g.shape}</span>
                        {already ? `${g.name} · already invited` : `Invite ${g.name}${fullMatch ? " · everyone's free" : ""}`}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>or invite someone directly</p>
                <div className="flex flex-wrap gap-2">
                  {[...people.filter((p) => p.id !== "you")].sort((a, b) => {
                    const order = { free: 0, tentative: 1 };
                    const sa = order[getStatus(a.id, inspectedKey)] ?? 2;
                    const sb = order[getStatus(b.id, inspectedKey)] ?? 2;
                    return sa - sb;
                  }).map((p) => {
                    const status = getStatus(p.id, inspectedKey);
                    const already = proposalExists("person", p.id, inspectedKey);
                    return (
                      <button
                        key={p.id}
                        disabled={already}
                        onClick={() => openInviteModal("person", p.id, inspectedKey, inspectedRangeEnd)}
                        className="text-sm rounded-full pl-1 pr-3 py-1 flex items-center gap-2"
                        style={{
                          background: already ? "var(--ink-3)" : status === "free" ? p.color : "transparent",
                          color: already ? "var(--mist)" : status === "free" ? "var(--on-accent)" : "var(--paper)",
                          border: `1px solid ${status === "free" ? p.color : "var(--ink-3)"}`,
                          cursor: already ? "default" : "pointer",
                        }}
                      >
                        <Avatar person={p} size={18} />
                        {already ? `${p.name} · already invited` : `${p.name}${status === "free" ? " · free" : status === "tentative" ? " · tentative" : ""}`}
                      </button>
                    );
                  })}
                </div>
                {inviteNote && <p className="text-xs mono mt-3" style={{ color: "var(--mint)" }}>{inviteNote}</p>}
              </div>
            )}

            {confirmDeleteId && (
              <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)" }} className="flex items-center justify-center p-4" onClick={() => setConfirmDeleteId(null)}>
                <div onClick={(e) => e.stopPropagation()} className="rounded-2xl p-6 w-full" style={{ maxWidth: 340, background: "var(--ink-2)", border: "1px solid var(--ink-4)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
                  <p className="display text-lg mb-2" style={{ color: "var(--paper)" }}>Delete this plan?</p>
                  <p className="text-sm mb-5" style={{ color: "var(--mist)" }}>This removes it for everyone and can't be undone.</p>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setConfirmDeleteId(null)} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                    <button onClick={confirmDeleteProposal} className="text-sm rounded-full px-5 py-2 display" style={{ background: "var(--ember)", color: "var(--paper)" }}>Delete</button>
                  </div>
                </div>
              </div>
            )}

            {inviteModal && (
              <div style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)" }} className="flex flex-col justify-end" onClick={() => setInviteModal(null)}>
                <div onClick={(e) => e.stopPropagation()} className="sync-scroll" style={{ maxHeight: "88%", overflowY: "auto", background: "var(--ink-2)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--ink-4)", boxShadow: "0 -20px 45px rgba(0,0,0,0.4)", padding: 20 }}>
                  <p className="display text-xl mb-1" style={{ color: "var(--paper)" }}>New invitation</p>
                  <p className="text-xs mono mb-4" style={{ color: "var(--mist)" }}>
                    {inviteModal.kind === "group" ? groups.find((g) => g.id === inviteModal.targetId)?.name : peopleById[inviteModal.targetId]?.name} · {rangeLabel(inviteModal.dateKey, inviteModal.endDateKey || inviteModal.dateKey)}
                  </p>
                  <label className="text-xs mono mb-1 block" style={{ color: "var(--mist)" }}>Name this invitation</label>
                  <input
                    value={inviteTitle}
                    onChange={(e) => setInviteTitle(e.target.value)}
                    className="text-sm rounded-lg px-3 py-2 outline-none w-full mb-4"
                    style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                  />
                  <label className="text-xs mono mb-1 block" style={{ color: "var(--mist)" }}>Message (optional)</label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="e.g. Thinking we do a long weekend — anyone able to fly in?"
                    rows={4}
                    className="text-sm rounded-lg px-3 py-2 outline-none w-full mb-4 resize-none"
                    style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                  />
                  <label className="text-xs mono mb-1 block" style={{ color: "var(--mist)" }}>Location (optional)</label>
                  <input
                    value={inviteLocation}
                    onChange={(e) => setInviteLocation(e.target.value)}
                    placeholder="e.g. Denver, CO or a specific address"
                    className="text-sm rounded-lg px-3 py-2 outline-none w-full mb-4"
                    style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                  />
                  <div className="flex gap-3 mb-4">
                    <div className="flex-1">
                      <label className="text-xs mono mb-1 block" style={{ color: "var(--mist)" }}>Time (optional)</label>
                      <input
                        value={inviteTime}
                        onChange={(e) => setInviteTime(e.target.value)}
                        placeholder={`e.g. 7:00 PM ${tzLabelFor(you.tz)}`}
                        className="text-sm rounded-lg px-3 py-2 outline-none w-full"
                        style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs mono mb-1 block" style={{ color: "var(--mist)" }}>Repeats</label>
                      <select value={inviteRepeat} onChange={(e) => setInviteRepeat(e.target.value)} className="text-sm rounded-lg px-3 py-2 outline-none w-full" style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}>
                        <option value="none">Doesn't repeat</option>
                        <option value="weekly">Weekly (4x)</option>
                        <option value="monthly">Monthly (4x)</option>
                      </select>
                    </div>
                  </div>
                  {inviteTime && (
                    <p className="text-xs mono mb-4" style={{ color: "var(--marigold)" }}>
                      Time is in your ({tzLabelFor(you.tz)}) local time — people in other time zones will see their own offset on the plan.
                    </p>
                  )}
                  <p className="text-xs mono mb-4" style={{ color: "var(--mist)", opacity: 0.8 }}>
                    This demo delivers the invite inside the app only — a real version would also be able to text this to people directly.
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setInviteModal(null)} className="text-sm rounded-full px-4 py-2" style={{ color: "var(--mist)" }}>Cancel</button>
                    <button onClick={sendInvite} className="text-sm rounded-full px-5 py-2 display" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Send</button>
                  </div>
                </div>
              </div>
            )}

            {inspectingEntity && inspectingEntity.type === "person" && (() => {
              const p = peopleById[inspectingEntity.id];
              if (!p) return null;
              const isSelf = p.id === editingAsId;
              const memberOfGroups = groups.filter((g) => g.memberIds.includes(p.id));
              const freeDates = ALL_YEAR_KEYS.filter((k) => getStatus(p.id, k) === "free" && daysFromToday(k) >= 0 && daysFromToday(k) < 30);
              const tentDates = ALL_YEAR_KEYS.filter((k) => getStatus(p.id, k) === "tentative" && daysFromToday(k) >= 0 && daysFromToday(k) < 30);
              const freeRanges = groupConsecutiveDates(freeDates);
              const tentRanges = groupConsecutiveDates(tentDates);
              const thread = dmThreads[dmKey(editingAsId, p.id)] || [];
              const pickDate = (start, end) => {
                setInspectingEntity(null);
                setInspectedKey(start);
                setInspectedRangeEnd(start === end ? null : end);
              };
              return (
                <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.55)" }} className="flex items-end" onClick={() => setInspectingEntity(null)}>
                  <div onClick={(e) => e.stopPropagation()} className="sync-scroll w-full" style={{ maxHeight: "90%", overflowY: "auto", background: "var(--ink-2)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--ink-4)", boxShadow: "0 -20px 45px rgba(0,0,0,0.4)", padding: 20 }}>
                    {p.background && (
                      <div className="rounded-2xl mb-3" style={{ height: 64, marginTop: -4, background: p.background, backgroundSize: "cover", backgroundPosition: "center" }} />
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar person={p} size={44} />
                        <div>
                          <p className="display text-xl" style={{ color: "var(--paper)" }}>{p.name}</p>
                          <p className="mono text-xs" style={{ color: "var(--mist)" }}>{p.city} · {tzLabelFor(p.tz)}{p.tz !== you.tz ? ` (${p.tz > you.tz ? "+" : ""}${p.tz - you.tz}h from you)` : ""}</p>
                        </div>
                      </div>
                      <button onClick={() => setInspectingEntity(null)} className="text-xs" style={{ color: "var(--mist)" }}>✕ close</button>
                    </div>

                    <button onClick={() => setShowCustomize((s) => !s)} className="text-xs mono mb-3" style={{ color: "var(--marigold)" }}>
                      {showCustomize ? "hide customize" : "customize avatar, color & background"}
                    </button>
                    {showCustomize && (
                      <div className="rounded-xl p-3 mb-4" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>color</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {COLOR_PALETTE.map((c) => (
                            <span key={c.hex} onClick={() => updatePerson(p.id, { color: c.hex })} className="sync-swatch inline-block rounded-full" style={{ width: 22, height: 22, background: c.hex, boxShadow: p.color === c.hex ? `0 0 0 2px var(--ink), 0 0 0 4px ${c.hex}` : "none" }} />
                          ))}
                        </div>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>avatar</p>
                        <div className="mb-4">
                          <AvatarPicker person={p} onChange={(patch) => updatePerson(p.id, patch)} />
                        </div>
                        <div className="mb-4">
                          <BackgroundPicker value={p.background} onChange={(bg) => updatePerson(p.id, { background: bg })} label="profile background" />
                        </div>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>birthday</p>
                        <input
                          type="date"
                          value={p.birthday ? `2000-${p.birthday}` : ""}
                          onChange={(e) => updatePerson(p.id, { birthday: e.target.value ? e.target.value.slice(5) : null })}
                          className="text-sm rounded-lg px-3 py-2 outline-none"
                          style={{ background: "var(--ink-2)", color: "var(--paper)", border: "1px solid var(--ink-3)", colorScheme: "dark" }}
                        />
                        <p className="text-xs mono mt-1" style={{ color: "var(--mist)", opacity: 0.7 }}>year doesn't matter — shows a 🎂 on My Calendar every year</p>
                      </div>
                    )}

                    {memberOfGroups.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {memberOfGroups.map((g) => (
                          <span key={g.id} className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1" style={{ border: `1px solid ${g.color}` }}>
                            <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: g.color }} />
                            <span className="text-xs" style={{ color: "var(--paper)" }}>{g.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>free in the next 30 days — tap a date to invite</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {freeRanges.length === 0 && tentRanges.length === 0 && <span className="text-sm" style={{ color: "var(--mist)" }}>Nothing marked yet this month.</span>}
                      {freeRanges.map(([s, e]) => (<button key={s} onClick={() => pickDate(s, e)} className="mono text-xs rounded-full px-2.5 py-1" style={{ background: p.color, color: "var(--on-accent)" }}>{rangeLabel(s, e)}</button>))}
                      {tentRanges.map(([s, e]) => (<button key={s} onClick={() => pickDate(s, e)} className="mono text-xs rounded-full px-2.5 py-1" style={{ border: `1px solid ${p.color}`, color: p.color }}>{rangeLabel(s, e)} ?</button>))}
                    </div>

                    <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>full calendar — scroll for the rest of the year, tap any date to invite</p>
                    <div className="sync-scroll grid grid-cols-2 gap-2 mb-5 p-1" style={{ maxHeight: 300, overflowY: "auto", background: "var(--ink)", borderRadius: 12 }}>
                      {months.map(({ year, month }) => (<MonthGrid key={`${year}-${month}`} year={year} month={month} mode="person" personId={p.id} compact onPick={pickDate} />))}
                    </div>

                    {isSelf ? (
                      <p className="text-sm" style={{ color: "var(--mist)" }}>This is you — switch who you're editing as in My Calendar to message yourself as someone else.</p>
                    ) : (
                      <>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>message {p.name} directly</p>
                        {thread.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {thread.map((m) => {
                              const sender = peopleById[m.fromId] || you;
                              return (
                                <div key={m.id} className="rounded-xl px-3 py-2" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                                  <p className="text-xs mono mb-0.5" style={{ color: sender.color }}>{sender.name}</p>
                                  <p className="text-sm" style={{ color: "var(--paper)" }}>{m.text}</p>
                                  <MessageReactions message={m} onToggle={(emoji) => toggleDmReaction(dmKey(editingAsId, p.id), m.id, emoji)} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <input
                            value={dmDraft}
                            onChange={(e) => setDmDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { sendDM(p.id, dmDraft); setDmDraft(""); } }}
                            placeholder={`Message as ${editingAsPerson.name}...`}
                            className="text-sm rounded-full px-4 py-2 outline-none flex-1"
                            style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                          />
                          <button onClick={() => { sendDM(p.id, dmDraft); setDmDraft(""); }} className="text-sm rounded-full px-4 py-2" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Send</button>
                        </div>
                        <p className="text-xs mono mt-3" style={{ color: "var(--mist)", opacity: 0.8 }}>This demo delivers messages inside the app only — a real version would be able to reach {p.name} by text too.</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {inspectingEntity && inspectingEntity.type === "group" && (() => {
              const g = groups.find((x) => x.id === inspectingEntity.id);
              if (!g) return null;
              const memberIds = ["you", ...g.memberIds];
              const upcomingFull = ALL_YEAR_KEYS.filter((k) => groupFullyFree(g, k) && daysFromToday(k) >= 0 && daysFromToday(k) < 30);
              const upcomingRanges = groupConsecutiveDates(upcomingFull);
              const thread = groupThreads[g.id] || [];
              const pickDate = (start, end) => {
                setInspectingEntity(null);
                setInspectedKey(start);
                setInspectedRangeEnd(start === end ? null : end);
              };
              return (
                <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.55)" }} className="flex items-end" onClick={() => setInspectingEntity(null)}>
                  <div onClick={(e) => e.stopPropagation()} className="sync-scroll w-full" style={{ maxHeight: "90%", overflowY: "auto", background: "var(--ink-2)", borderTopLeftRadius: 28, borderTopRightRadius: 28, border: "1px solid var(--ink-4)", boxShadow: "0 -20px 45px rgba(0,0,0,0.4)", padding: 20 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: hexToRgba(g.color, 0.25), border: `1.5px solid ${g.color}`, color: g.color, fontSize: 16 }}>{g.shape}</span>
                        <div>
                          <p className="display text-xl" style={{ color: "var(--paper)" }}>{g.name}</p>
                          <p className="mono text-xs" style={{ color: "var(--mist)" }}>{memberIds.length} people</p>
                        </div>
                      </div>
                      <button onClick={() => setInspectingEntity(null)} className="text-xs" style={{ color: "var(--mist)" }}>✕ close</button>
                    </div>

                    <button onClick={() => setShowCustomize((s) => !s)} className="text-xs mono mb-3" style={{ color: "var(--marigold)" }}>
                      {showCustomize ? "hide customize" : "customize color & icon"}
                    </button>
                    {showCustomize && (
                      <div className="rounded-xl p-3 mb-4" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>color</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {COLOR_PALETTE.map((c) => (
                            <span key={c.hex} onClick={() => updateGroup(g.id, { color: c.hex })} className="sync-swatch inline-block rounded-full" style={{ width: 22, height: 22, background: c.hex, boxShadow: g.color === c.hex ? `0 0 0 2px var(--ink), 0 0 0 4px ${c.hex}` : "none" }} />
                          ))}
                        </div>
                        <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>icon</p>
                        <div className="flex flex-wrap gap-2">
                          {GROUP_SHAPES.map((s) => (
                            <button key={s} onClick={() => updateGroup(g.id, { shape: s })} className="flex items-center justify-center rounded-full" style={{ width: 26, height: 26, background: g.shape === s ? "var(--ink-3)" : "transparent", border: "1px solid var(--ink-4)", color: g.color, fontSize: 13 }}>{s}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {memberIds.map((id) => {
                        const person = peopleById[id];
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1" style={{ border: "1px solid var(--ink-3)" }}>
                            <Avatar person={person} size={18} />
                            <span className="text-xs" style={{ color: "var(--paper)" }}>{person.name}</span>
                          </span>
                        );
                      })}
                    </div>

                    <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>everyone free in the next 30 days — tap a date to invite</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {upcomingRanges.length === 0 ? (
                        <span className="text-sm" style={{ color: "var(--mist)" }}>No shared free days yet this month.</span>
                      ) : (
                        upcomingRanges.map(([s, e]) => (<button key={s} onClick={() => pickDate(s, e)} className="mono text-xs rounded-full px-2.5 py-1" style={{ background: g.color, color: "var(--on-accent)" }}>{rangeLabel(s, e)}</button>))
                      )}
                    </div>

                    <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>full calendar — scroll for the rest of the year, tap any date to invite</p>
                    <div className="sync-scroll grid grid-cols-2 gap-2 mb-5 p-1" style={{ maxHeight: 300, overflowY: "auto", background: "var(--ink)", borderRadius: 12 }}>
                      {months.map(({ year, month }) => (<MonthGrid key={`${year}-${month}`} year={year} month={month} mode="group" groupId={g.id} compact onPick={pickDate} />))}
                    </div>

                    <p className="text-xs mono mb-2" style={{ color: "var(--mist)" }}>message the group</p>
                    {thread.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {thread.map((m) => {
                          const sender = peopleById[m.personId] || you;
                          return (
                            <div key={m.id} className="rounded-xl px-3 py-2" style={{ background: "var(--ink)", border: "1px solid var(--ink-3)" }}>
                              <p className="text-xs mono mb-0.5" style={{ color: sender.color }}>{sender.name}</p>
                              <p className="text-sm" style={{ color: "var(--paper)" }}>{m.text}</p>
                              <MessageReactions message={m} onToggle={(emoji) => toggleGroupReaction(g.id, m.id, emoji)} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        value={dmDraft}
                        onChange={(e) => setDmDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { sendGroupMessage(g.id, dmDraft); setDmDraft(""); } }}
                        placeholder={`Message as ${editingAsPerson.name}...`}
                        className="text-sm rounded-full px-4 py-2 outline-none flex-1"
                        style={{ background: "var(--ink)", color: "var(--paper)", border: "1px solid var(--ink-3)" }}
                      />
                      <button onClick={() => { sendGroupMessage(g.id, dmDraft); setDmDraft(""); }} className="text-sm rounded-full px-4 py-2" style={{ background: "var(--marigold)", color: "var(--on-accent)" }}>Send</button>
                    </div>
                    <p className="text-xs mono mt-3" style={{ color: "var(--mist)", opacity: 0.8 }}>This demo delivers messages inside the app only — a real version would reach the group by text too.</p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </PhoneShell>
  );
}
