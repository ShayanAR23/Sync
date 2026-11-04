"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Users, PartyPopper, MessageCircle } from "lucide-react";
import { SyncMark } from "./Logo";
import { Saamy } from "./Mascot";

// Instagram/TikTok-story-style onboarding: autoplaying progress bars,
// tap left/right to navigate, hold to pause. Three phases in sequence:
// story (value-prop slides) -> signup (mock account form) -> tour
// (mascot-guided walkthrough of the four tabs) -> the real app.
const DUR = 4200;
const FREE_CELLS = new Set([1, 4, 8, 11, 15, 17, 22, 25]);
const HIT_CELLS = new Set([9, 10, 16]);

const SLIDES = [
  {
    key: "scattered",
    lead: "Everyone moved.",
    tail: ["Nobody's calendar did."],
    caption: "Four cities. Three time zones. One group chat that hasn't picked a date since May.",
  },
  {
    key: "overlap",
    lead: "There are days you're",
    tail: ["all free. You just", "can't see them."],
    caption: "Sync reads every calendar in the group and surfaces the windows that actually overlap.",
  },
  {
    key: "plan",
    lead: "Book it before",
    tail: ["life fills it in."],
    caption: "Lock the date, add it to every calendar, and stop losing the year to logistics.",
  },
];

const TOUR_SLIDES = [
  {
    key: "tour-calendar",
    icon: CalendarDays,
    iconBg: "var(--i-marigold)",
    lead: "This is",
    tail: ["My Calendar."],
    caption: "Your personal calendar — tap any day to mark it free, tentative, or add an event.",
    pose: "point",
  },
  {
    key: "tour-friends",
    icon: Users,
    iconBg: "var(--i-sky)",
    lead: "This is",
    tail: ["Friends Calendars."],
    caption: "Compare availability with friends and groups, then surface the best overlapping time.",
    pose: "wave",
  },
  {
    key: "tour-plans",
    icon: PartyPopper,
    iconBg: "var(--i-punch)",
    lead: "This is",
    tail: ["Plans."],
    caption: "Propose a date, track RSVPs, and watch it lock in.",
    pose: "party",
  },
  {
    key: "tour-messages",
    icon: MessageCircle,
    iconBg: "var(--i-leaf)",
    lead: "This is",
    tail: ["Messages."],
    caption: "Chat through the details without ever leaving the app.",
    pose: "chat",
  },
];

const CHIPS = [
  { text: "standup 9am", sub: "Aadil · PST", style: { left: "2%", top: "4%" }, color: "var(--i-sky)" },
  { text: "night shift", sub: "Ahad · GMT", style: { right: "0%", top: "17%" }, delay: "-2s", color: "var(--i-punch)" },
  { text: "kids' recital", sub: "Mom · CST", style: { left: "8%", top: "31%" }, delay: "-4s", color: "var(--i-leaf)" },
  { text: "finals week", sub: "Yaseen · EST", style: { right: "6%", top: "45%" }, delay: "-1s", color: "var(--i-marigold)" },
  { text: "on call", sub: "Aadil · PST", style: { left: "0%", top: "58%" }, delay: "-5s", color: "var(--i-sky)" },
  { text: "flying home", sub: "Ahad · GMT", style: { right: "12%", top: "70%" }, delay: "-3s", color: "var(--i-punch)" },
];

const PLAN_CARDS = [
  {
    title: "Weekend Crew · Nov 14",
    meta: "Chicago · flights from $118 this week",
    who: [
      { name: "Aadil in", yes: true },
      { name: "Ahad in", yes: true },
      { name: "Yaseen maybe", yes: false },
      { name: "You", yes: false },
    ],
    accent: "#6E8B4A",
  },
  {
    title: "Thanksgiving at Mom's",
    meta: "Houston · 3 of 5 confirmed",
    who: [
      { name: "Mom in", yes: true },
      { name: "Sara in", yes: true },
      { name: "Dad", yes: false },
    ],
    accent: "#D9714B",
  },
];

// Thin wrapper around the shared Saamy mascot (components/Mascot.jsx) so
// every call site in this file keeps working unchanged — now renders the
// full-body version with the onboarding bob animation.
function SyncMascot({ size = 108, pose = "default" }) {
  return <Saamy size={size} bob pose={pose} />;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Randomized per mount. Safe to compute during the initial render only
// because this whole component is loaded client-only (see the `dynamic`
// import with `ssr: false` in SyncApp.jsx) — otherwise the server and
// client would each roll different values and break hydration.
function useGridCells() {
  const ref = useRef(null);
  if (!ref.current) {
    ref.current = Array.from({ length: 28 }, (_, n) => ({
      n,
      hit: HIT_CELLS.has(n),
      free: FREE_CELLS.has(n),
      tx: (Math.random() * 150 - 75).toFixed(1) + "px",
      ty: (Math.random() * 130 - 40).toFixed(1) + "px",
      r: (Math.random() * 26 - 13).toFixed(1) + "deg",
    }));
  }
  return ref.current;
}

export default function IntroStory({ onDone, onName }) {
  const [phase, setPhase] = useState("story"); // "story" | "signup" | "tour"
  const [i, setI] = useState(0);
  const [nameInput, setNameInput] = useState("");
  const [fadingOut, setFadingOut] = useState(false);
  const cells = useGridCells();
  const timerRef = useRef(null);
  const barFillRefs = useRef({});
  const heldTimeoutRef = useRef(null);
  const pausedRef = useRef(false);

  const activeSlides = phase === "tour" ? TOUR_SLIDES : SLIDES;

  const clearTimer = () => timerRef.current && clearTimeout(timerRef.current);

  const finish = () => {
    clearTimer();
    setFadingOut(true);
    setTimeout(() => onDone && onDone(), 450);
  };

  const commitName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && onName) onName(trimmed);
  };
  const enterTour = () => {
    commitName();
    setPhase("tour");
    setI(0);
  };
  const loginInstead = () => {
    commitName();
    finish();
  };

  const go = (d) => {
    if (phase === "signup") return;
    const next = i + d;
    if (next < 0) return;
    if (next >= activeSlides.length) {
      if (phase === "story") { setPhase("signup"); setI(0); return; }
      return finish();
    }
    setI(next);
  };

  useEffect(() => {
    clearTimer();
    if (phase === "signup") return;
    pausedRef.current = false;
    timerRef.current = setTimeout(() => go(1), DUR);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase]);

  const handlePointerDown = () => {
    if (phase === "signup") return;
    heldTimeoutRef.current = setTimeout(() => {
      clearTimer();
      pausedRef.current = true;
      const el = barFillRefs.current[i];
      if (el) el.style.animationPlayState = "paused";
    }, 220);
  };
  const handlePointerUp = () => {
    clearTimeout(heldTimeoutRef.current);
    if (pausedRef.current) {
      pausedRef.current = false;
      const el = barFillRefs.current[i];
      if (el) {
        el.style.animationPlayState = "running";
        const remaining = DUR * (1 - el.getBoundingClientRect().width / el.parentElement.offsetWidth);
        timerRef.current = setTimeout(() => go(1), remaining);
      }
    }
  };

  return (
    <div
      className="intro-stage"
      style={{ "--dur": `${DUR}ms`, opacity: fadingOut ? 0 : 1, transition: "opacity .45s ease" }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .intro-stage {
          --i-ink:#0A0B0D; --i-ink-2:#131418; --i-ink-3:#1C1E22; --i-ink-4:#27292E;
          --i-paper:#F3F4F6; --i-marigold:#A9835A; --i-on-accent:#F3F4F6; --i-mist:#86898F;
          --i-leaf:#A3C96B; --i-punch:#9B86C4; --i-sky:#5FA8A6;
        }
        .intro-stage {
          position: relative; width: 100%; height: 100%; overflow: hidden;
          background: var(--i-ink); color: var(--i-paper);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          user-select: none; -webkit-tap-highlight-color: transparent;
        }
        .intro-bars { position: absolute; inset: 44px 14px auto; display: flex; gap: 5px; z-index: 9; }
        .intro-bar { flex: 1; height: 2.5px; border-radius: 2px; background: var(--i-ink-4); overflow: hidden; }
        .intro-bar i { display: block; height: 100%; width: 0; background: var(--i-paper); }
        .intro-bar.done i { width: 100%; }
        .intro-bar.live i { animation: intro-fill var(--dur) linear forwards; }
        @keyframes intro-fill { to { width: 100%; } }

        .intro-slide {
          position: absolute; inset: 0; padding: 78px 26px 40px;
          display: flex; flex-direction: column;
          opacity: 0; pointer-events: none; transition: opacity .5s ease;
        }
        .intro-slide.intro-on { opacity: 1; pointer-events: auto; }

        .intro-stage h2 {
          font-family: 'Inter', -apple-system, sans-serif;
          font-weight: 800; font-size: clamp(24px, 7.4vw, 32px); line-height: 1.16;
          letter-spacing: -0.02em; max-width: 15ch;
        }
        .intro-stage h2 span { display: block; color: var(--i-mist); }
        .intro-cap { margin-top: auto; font-size: 12.5px; line-height: 1.6; color: var(--i-mist); max-width: 30ch; font-weight: 500; }

        .intro-canvas { position: relative; flex: 1; margin: 26px -6px 0; }

        .intro-blob {
          position: absolute; border-radius: 50%; filter: blur(32px);
          opacity: 0; transition: opacity 1.1s ease;
        }
        .intro-slide.intro-on .intro-blob { opacity: 0.35; }

        .intro-chip {
          position: absolute; white-space: nowrap;
          font-size: 11.5px; padding: 6px 11px; border-radius: 6px;
          background: var(--i-ink-2); color: var(--i-paper);
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          font-weight: 500;
        }
        .intro-chip b { display: block; font-weight: 500; font-size: 9px; color: var(--i-mist); letter-spacing: .04em; }
        .intro-slide.intro-on .intro-drift { animation: intro-drift 7s ease-in-out infinite alternate; }
        @keyframes intro-drift { to { transform: translate(0,-9px); } }
        .intro-bob { animation: intro-bob 3.4s ease-in-out infinite; transform-origin: 50% 100%; }
        @keyframes intro-bob { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(-2deg); } }
        .intro-blink { animation: intro-blink 4.2s ease-in-out infinite; transform-origin: center; }
        @keyframes intro-blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }

        .intro-grid {
          position: absolute; inset: 0;
          display: grid; grid-template-columns: repeat(7,1fr); gap: 6px 5px;
          align-content: start; padding-top: 6px;
        }
        .intro-cell {
          height: 26px; border-radius: 7px; background: var(--i-ink-3);
          transform: translate(var(--tx),var(--ty)) rotate(var(--r));
          opacity: .5; transition: transform .95s cubic-bezier(.22,1,.36,1),
                                    opacity .6s ease, background .5s ease;
          transition-delay: calc(var(--i) * 26ms);
        }
        .intro-slide.intro-on .intro-cell { transform: none; opacity: 1; }
        .intro-slide.intro-on .intro-cell.free { background: var(--i-marigold); }
        .intro-slide.intro-on .intro-cell.hit { background: var(--i-marigold); box-shadow: 0 0 0 2px rgba(169,131,90,.5); }
        .intro-flag {
          position: absolute; left: 50%; translate: -50% 0; bottom: 12%;
          font-size: 11px; color: var(--i-on-accent); background: var(--i-marigold);
          padding: 7px 14px; border-radius: 6px; font-weight: 800;
          opacity: 0; transition: opacity .5s ease 1.5s;
        }
        .intro-slide.intro-on .intro-flag { opacity: 1; }

        .intro-cards { display: flex; flex-direction: column; gap: 11px; justify-content: center; }
        .intro-card {
          background: var(--i-ink-2); border-radius: 8px; padding: 16px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          opacity: 0; translate: 0 14px;
          transition: opacity .55s ease, translate .55s cubic-bezier(.22,1,.36,1), box-shadow .3s ease;
          transition-delay: calc(.15s + var(--i) * .13s);
        }
        .intro-slide.intro-on .intro-card { opacity: 1; translate: 0 0; }
        .intro-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
        .intro-meta { font-size: 11px; color: var(--i-mist); }
        .intro-who { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
        .intro-pill { font-size: 10.5px; padding: 4px 9px; border-radius: 6px; background: var(--i-ink-3); color: var(--i-mist); font-weight: 500; }
        .intro-pill.yes { background: rgba(169,131,90,.28); color: #DCC09A; }

        .intro-tour-canvas { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        .intro-tour-icon {
          width: 92px; height: 92px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.4);
          opacity: 0; transform: scale(0.7);
          transition: opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1);
        }
        .intro-slide.intro-on .intro-tour-icon { opacity: 1; transform: scale(1); }
        .intro-tour-mascot { opacity: 0; transition: opacity .5s ease .2s; }
        .intro-slide.intro-on .intro-tour-mascot { opacity: 1; }

        .intro-signup { justify-content: flex-start; }
        .intro-signup-sub { font-size: 13px; line-height: 1.55; color: var(--i-mist); margin: 8px 0 26px; max-width: 32ch; font-weight: 500; }
        .intro-field { margin-bottom: 14px; }
        .intro-field label { display: block; font-size: 11px; font-weight: 700; color: var(--i-mist); margin-bottom: 6px; letter-spacing: .02em; text-transform: uppercase; }
        .intro-field input {
          width: 100%; box-sizing: border-box; font-family: inherit; font-size: 15px;
          padding: 13px 14px; border-radius: 6px; border: 1px solid var(--i-ink-3);
          background: var(--i-ink-2); color: var(--i-paper); outline: none;
          transition: border-color 150ms ease;
        }
        .intro-field input:focus { border-color: var(--i-marigold); }
        .intro-primary-btn {
          width: 100%; box-sizing: border-box; border: 0; border-radius: 6px;
          background: var(--i-marigold); color: var(--i-on-accent); font-family: inherit;
          font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
          padding: 14px; cursor: pointer; margin-top: 4px;
          transition: transform 120ms ease;
        }
        .intro-primary-btn:active { transform: scale(0.97); }
        .intro-secondary-btn {
          width: 100%; border: 0; background: transparent; color: var(--i-mist);
          font-family: inherit; font-size: 13px; font-weight: 600; padding: 12px; cursor: pointer; margin-top: 2px;
        }
        .intro-finish-btn { margin-top: 18px; position: relative; z-index: 10; }

        .intro-tap { position: absolute; inset: 0; display: flex; z-index: 8; }
        .intro-tap button { flex: 1; border: 0; background: transparent; cursor: pointer; }
        .intro-skip {
          position: absolute; right: 16px; bottom: 26px; z-index: 10;
          border: 0; background: transparent; color: var(--i-mist);
          font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer; padding: 8px;
        }
        .intro-wordmark { position: absolute; left: 22px; bottom: 26px; z-index: 10; display: flex; align-items: center; gap: 6px; }
        .intro-wordmark span { font-size: 13px; font-weight: 800; letter-spacing: 3px; color: var(--i-paper); }

        @media (prefers-reduced-motion: reduce) {
          .intro-stage * { animation: none !important; transition-duration: .01ms !important; }
          .intro-cell { transform: none; opacity: 1; }
        }
      `}</style>

      {phase !== "signup" && (
        <div className="intro-bars">
          {activeSlides.map((s, n) => (
            <div key={s.key} className={`intro-bar ${n < i ? "done" : n === i ? "live" : ""}`}>
              <i key={`${s.key}-${i}-${phase}`} ref={(el) => (barFillRefs.current[n] = el)} />
            </div>
          ))}
        </div>
      )}

      {phase === "story" && SLIDES.map((s, n) => (
        <section key={s.key} className={`intro-slide ${n === i ? "intro-on" : ""}`}>
          <h2>
            {s.lead}
            <span>
              {s.tail.map((line, idx) => (
                <span key={idx}>
                  {line}
                  {idx < s.tail.length - 1 && <br />}
                </span>
              ))}
            </span>
          </h2>

          {n === 0 && (
            <div className="intro-canvas">
              <div className="intro-blob" style={{ width: 160, height: 160, left: "-10%", top: "6%", background: "var(--i-sky)" }} />
              <div className="intro-blob" style={{ width: 140, height: 140, right: "-8%", top: "48%", background: "var(--i-punch)" }} />
              {CHIPS.map((c, idx) => (
                <div key={idx} className="intro-chip intro-drift" style={{ ...c.style, animationDelay: c.delay, borderColor: c.color }}>
                  {c.text} <b>{c.sub}</b>
                </div>
              ))}
            </div>
          )}

          {n === 1 && (
            <div className="intro-canvas">
              <div className="intro-blob" style={{ width: 180, height: 180, right: "-12%", top: "2%", background: "var(--i-leaf)" }} />
              <div className="intro-grid">
                {cells.map((c) => (
                  <div
                    key={c.n}
                    className={`intro-cell ${c.hit ? "hit" : c.free ? "free" : ""}`}
                    style={{ "--i": c.n, "--tx": c.tx, "--ty": c.ty, "--r": c.r }}
                  />
                ))}
              </div>
              <div className="intro-flag">Nov 14–16 · everyone's open</div>
            </div>
          )}

          {n === 2 && (
            <div className="intro-canvas intro-cards">
              <div className="intro-blob" style={{ width: 150, height: 150, left: "-10%", bottom: "4%", background: "var(--i-sky)" }} />
              {PLAN_CARDS.map((card, idx) => (
                <div key={idx} className="intro-card" style={{ "--i": idx, borderColor: card.accent }}>
                  <h3>{card.title}</h3>
                  <p className="intro-meta">{card.meta}</p>
                  <div className="intro-who">
                    {card.who.map((w, wi) => (
                      <span key={wi} className={`intro-pill ${w.yes ? "yes" : ""}`} style={w.yes ? { background: hexToRgba(card.accent, 0.18), color: card.accent } : undefined}>
                        {w.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="intro-cap">{s.caption}</p>
        </section>
      ))}

      {phase === "signup" && (
        <section className="intro-slide intro-on intro-signup">
          <h2>Nice to meet you.</h2>
          <p className="intro-signup-sub">Create a quick profile so your friends know who's asking — Sync keeps it on this device.</p>
          <div className="intro-field">
            <label htmlFor="intro-name">Your name</label>
            <input id="intro-name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enterTour()} placeholder="e.g. Shayan" autoFocus />
          </div>
          <button className="intro-primary-btn" onClick={enterTour}>Create account</button>
          <button className="intro-secondary-btn" onClick={loginInstead}>I already have an account</button>
        </section>
      )}

      {phase === "tour" && TOUR_SLIDES.map((s, n) => {
        const Icon = s.icon;
        return (
          <section key={s.key} className={`intro-slide ${n === i ? "intro-on" : ""}`}>
            <h2>
              {s.lead}
              <span>
                {s.tail.map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < s.tail.length - 1 && <br />}
                  </span>
                ))}
              </span>
            </h2>
            <div className="intro-canvas intro-tour-canvas">
              <div className="intro-tour-icon" style={{ background: s.iconBg }}>
                <Icon size={42} color="#fff" strokeWidth={2.2} />
              </div>
              <div className="intro-tour-mascot"><SyncMascot size={76} pose={s.pose} /></div>
            </div>
            <p className="intro-cap">{s.caption}</p>
            {n === TOUR_SLIDES.length - 1 && (
              <button className="intro-primary-btn intro-finish-btn" onClick={finish}>Let's go →</button>
            )}
          </section>
        );
      })}

      {phase !== "signup" && (
        <div className="intro-tap">
          <button aria-label="Previous" onClick={() => go(-1)} />
          <button aria-label="Next" onClick={() => go(1)} />
        </div>
      )}
      <div className="intro-wordmark">
        <SyncMark size={16} />
        <span>SYNC</span>
      </div>
      <button className="intro-skip" onClick={finish}>Skip</button>
    </div>
  );
}
