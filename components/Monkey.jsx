"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, Lock, Check, Shuffle, X } from "lucide-react";
import { monkeySvg, SLOTS, DEFAULT_LOOK, UNLOCKS, ACHIEVEMENTS, isUnlocked, randomLook } from "./monkeyData";

// One plush monkey. `crop="bust"` = head + shoulders (avatars).
export function Monkey({ look, size = 120, crop = null, shadow = true }) {
  const key = JSON.stringify(look || {}) + "|" + size + "|" + crop + "|" + shadow;
  const html = useMemo(() => monkeySvg(look, { size, crop, shadow }), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span suppressHydrationWarning style={{ display: "inline-block", lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
}

const PINE_BG = "linear-gradient(170deg,#07140F 0%,#0F2E22 55%,#1C4A38 100%)";

// Full-screen "Dress your monkey" sheet. Edits a draft look; Save hands it back.
export function MonkeyCustomizer({ look, progress = {}, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...DEFAULT_LOOK, ...(look || {}) });
  const [slotId, setSlotId] = useState("hat");
  const slot = SLOTS.find((s) => s.id === slotId);
  const names = Object.keys(slot.items);
  const lockedNames = Object.keys(slot.items).filter((n) => !isUnlocked(n, progress));
  const pick = (name) => {
    if (lockedNames.includes(name)) return;
    setDraft((d) => {
      const next = { ...d };
      if (slot.id === "fur") next.fur = name;
      else if (next[slot.id] === name) delete next[slot.id]; // tap again to take it off
      else next[slot.id] = name;
      return next;
    });
  };
  const summary = ["outfit", "hat", "eyes", "neck", "shoes", "held"].map((s) => draft[s]).filter(Boolean);
  const nextGoals = lockedNames.map((n) => ({ n, ...UNLOCKS[n] }));
  const totalUnlocked = Object.keys(UNLOCKS).filter((n) => isUnlocked(n, progress)).length;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 70, background: PINE_BG, color: "#E6FFF3", display: "flex", flexDirection: "column", fontFamily: "'Nunito','Inter',sans-serif" }}>
      <div className="flex items-center justify-between px-5" style={{ paddingTop: 40 }}>
        <button onClick={onClose} aria-label="Back" style={{ color: "#E6FFF3" }}><ChevronLeft size={24} /></button>
        <p style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 20, fontWeight: 600 }}>Dress your monkey</p>
        <span style={{ width: 24 }} />
      </div>

      <div className="relative mx-auto flex items-center justify-center" style={{ width: 250, height: 262, marginTop: 4 }}>
        <div style={{ position: "absolute", left: 10, right: 10, top: 14, bottom: 8, borderRadius: 130, background: "radial-gradient(circle,rgba(124,240,184,0.3) 0%,rgba(124,240,184,0) 68%)" }} />
        <div style={{ position: "relative" }}><Monkey look={draft} size={200} /></div>
      </div>

      <input
        value={draft.name || ""}
        onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.slice(0, 16) }))}
        placeholder="Name your monkey"
        aria-label="Monkey name"
        className="text-center outline-none bg-transparent mx-auto"
        style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 22, fontWeight: 600, color: "#E6FFF3", width: 220 }}
      />
      <p className="text-center" style={{ fontSize: 13, color: "#8CBFA6", minHeight: 18 }}>{summary.length ? summary.join(", ") : "Nothing on yet"}</p>

      <div className="flex gap-2 px-4 mt-3 overflow-x-auto sync-scroll" style={{ flexShrink: 0 }}>
        {SLOTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSlotId(s.id)}
            style={{ flex: "0 0 auto", padding: "8px 14px", borderRadius: 16, fontSize: 13, fontWeight: 700, background: s.id === slotId ? "#7CF0B8" : "rgba(255,255,255,0.08)", color: s.id === slotId ? "#052015" : "#8CBFA6" }}
          >{s.label}</button>
        ))}
      </div>

      <div className="sync-scroll px-4 mt-3" style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
          {slot.id !== "fur" && (
            <button onClick={() => setDraft((d) => { const n = { ...d }; delete n[slot.id]; return n; })} aria-label="None"
              style={{ height: 96, borderRadius: 18, border: !draft[slot.id] ? "2px solid #7CF0B8" : "1px solid rgba(124,240,184,0.18)", background: "rgba(255,255,255,0.06)", color: "#8CBFA6" }}
              className="flex flex-col items-center justify-center gap-1">
              <X size={20} /><span style={{ fontSize: 11, fontWeight: 700 }}>None</span>
            </button>
          )}
          {names.map((name) => {
            const sel = slot.id === "fur" ? draft.fur === name : draft[slot.id] === name;
            const locked = lockedNames.includes(name);
            const preview = { ...draft, [slot.id]: name };
            return (
              <button key={name} onClick={() => pick(name)} aria-label={name} aria-pressed={sel}
                style={{ position: "relative", height: 96, borderRadius: 18, overflow: "hidden", border: sel ? "2px solid #7CF0B8" : "1px solid rgba(124,240,184,0.18)", background: sel ? "rgba(124,240,184,0.14)" : "rgba(255,255,255,0.06)" }}
                className="flex items-center justify-center">
                <Monkey look={preview} size={64} shadow={false} />
                {sel && <span style={{ position: "absolute", right: 6, top: 6, width: 18, height: 18, borderRadius: 9, background: "#7CF0B8", color: "#052015" }} className="flex items-center justify-center"><Check size={11} strokeWidth={3.4} /></span>}
                {locked && <span style={{ position: "absolute", inset: 0, background: "rgba(7,20,15,0.62)" }} className="flex items-center justify-center"><Lock size={20} /></span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3" style={{ fontSize: 12, color: "#8CBFA6" }}>{totalUnlocked} of {Object.keys(UNLOCKS).length} unlocks earned</p>
        {nextGoals.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {nextGoals.map((g) => (
              <p key={g.n} className="flex items-center gap-2" style={{ fontSize: 12.5, color: "#BFE6D2", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,240,184,0.18)", borderRadius: 14, padding: "8px 12px" }}>
                <Lock size={13} style={{ flexShrink: 0 }} /> <span><b>{g.n}</b>: {ACHIEVEMENTS[g.a].verb} {g.n} ({Math.min(progress[g.a] || 0, g.n)}/{g.n} {ACHIEVEMENTS[g.a].label})</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pt-2" style={{ paddingBottom: 28 }}>
        <button onClick={() => setDraft((d) => ({ ...randomLook(progress), name: d.name }))}
          className="flex items-center gap-2" style={{ padding: "14px 18px", borderRadius: 22, background: "rgba(255,255,255,0.1)", color: "#E6FFF3", fontSize: 14, fontWeight: 700 }}>
          <Shuffle size={16} /> Shuffle
        </button>
        <button onClick={() => onSave(draft)} style={{ flex: 1, padding: "14px 0", borderRadius: 22, background: "#7CF0B8", color: "#052015", fontSize: 15, fontWeight: 700 }}>Save look</button>
      </div>
    </div>
  );
}
