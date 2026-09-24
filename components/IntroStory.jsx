"use client";

import { useEffect, useRef, useState } from "react";
import { SyncMark } from "./Logo";

// Instagram/TikTok-story-style onboarding: autoplaying progress bars,
// tap left/right to navigate, hold to pause. Recolored to Sync's own
// dark palette + Inter typeface instead of the original prototype's.
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

const CHIPS = [
  { text: "standup 9am", sub: "Aadil · PST", style: { left: "2%", top: "4%" } },
  { text: "night shift", sub: "Ahad · GMT", style: { right: "0%", top: "17%" }, delay: "-2s" },
  { text: "kids' recital", sub: "Mom · CST", style: { left: "8%", top: "31%" }, delay: "-4s" },
  { text: "finals week", sub: "Yaseen · EST", style: { right: "6%", top: "45%" }, delay: "-1s" },
  { text: "on call", sub: "Aadil · PST", style: { left: "0%", top: "58%" }, delay: "-5s" },
  { text: "flying home", sub: "Ahad · GMT", style: { right: "12%", top: "70%" }, delay: "-3s" },
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
  },
  {
    title: "Thanksgiving at Mom's",
    meta: "Houston · 3 of 5 confirmed",
    who: [
      { name: "Mom in", yes: true },
      { name: "Sara in", yes: true },
      { name: "Dad", yes: false },
    ],
  },
];

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

export default function IntroStory({ onDone }) {
  const [i, setI] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const cells = useGridCells();
  const timerRef = useRef(null);
  const barFillRefs = useRef({});
  const heldTimeoutRef = useRef(null);
  const pausedRef = useRef(false);

  const clearTimer = () => timerRef.current && clearTimeout(timerRef.current);

  const finish = () => {
    clearTimer();
    setFadingOut(true);
    setTimeout(() => onDone && onDone(), 450);
  };

  const go = (d) => {
    const next = i + d;
    if (next < 0) return;
    if (next >= SLIDES.length) return finish();
    setI(next);
  };

  useEffect(() => {
    clearTimer();
    pausedRef.current = false;
    timerRef.current = setTimeout(() => go(1), DUR);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const handlePointerDown = () => {
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
        .intro-stage {
          --i-ink:#000000; --i-ink-2:#1C1C1E; --i-ink-3:#2C2C2E; --i-ink-4:#3A3A3C;
          --i-paper:#F5F5F7; --i-marigold:#FF7A1A; --i-mist:#98989D;
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
          font-weight: 800; font-size: clamp(24px, 7.4vw, 32px); line-height: 1.16;
          letter-spacing: -0.02em; max-width: 15ch;
        }
        .intro-stage h2 span { display: block; color: var(--i-mist); }
        .intro-cap { margin-top: auto; font-size: 12.5px; line-height: 1.6; color: var(--i-mist); max-width: 30ch; font-weight: 500; }

        .intro-canvas { position: relative; flex: 1; margin: 26px -6px 0; }

        .intro-chip {
          position: absolute; white-space: nowrap;
          font-size: 11.5px; padding: 6px 11px; border-radius: 999px;
          background: var(--i-ink-2); color: var(--i-paper);
          border: 1px solid var(--i-ink-3); font-weight: 500;
        }
        .intro-chip b { display: block; font-weight: 500; font-size: 9px; color: var(--i-mist); letter-spacing: .04em; }
        .intro-slide.intro-on .intro-drift { animation: intro-drift 7s ease-in-out infinite alternate; }
        @keyframes intro-drift { to { transform: translate(0,-9px); } }

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
        .intro-slide.intro-on .intro-cell.hit { background: var(--i-marigold); box-shadow: 0 0 0 2px rgba(255,122,26,.35); }
        .intro-flag {
          position: absolute; left: 50%; translate: -50% 0; bottom: 12%;
          font-size: 11px; color: #FFFFFF; background: var(--i-marigold);
          padding: 7px 14px; border-radius: 999px; font-weight: 700;
          opacity: 0; transition: opacity .5s ease 1.5s;
        }
        .intro-slide.intro-on .intro-flag { opacity: 1; }

        .intro-cards { display: flex; flex-direction: column; gap: 11px; justify-content: center; }
        .intro-card {
          background: var(--i-ink-2); border-radius: 16px; padding: 16px;
          border: 1px solid var(--i-ink-3);
          opacity: 0; translate: 0 14px;
          transition: opacity .55s ease, translate .55s cubic-bezier(.22,1,.36,1);
          transition-delay: calc(.15s + var(--i) * .13s);
        }
        .intro-slide.intro-on .intro-card { opacity: 1; translate: 0 0; }
        .intro-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 3px; }
        .intro-meta { font-size: 11px; color: var(--i-mist); }
        .intro-who { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
        .intro-pill { font-size: 10.5px; padding: 4px 9px; border-radius: 999px; background: var(--i-ink-3); color: var(--i-mist); font-weight: 500; }
        .intro-pill.yes { background: rgba(255,122,26,.18); color: var(--i-marigold); }

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

      <div className="intro-bars">
        {SLIDES.map((s, n) => (
          <div key={s.key} className={`intro-bar ${n < i ? "done" : n === i ? "live" : ""}`}>
            <i key={`${s.key}-${i}`} ref={(el) => (barFillRefs.current[n] = el)} />
          </div>
        ))}
      </div>

      {SLIDES.map((s, n) => (
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
              {CHIPS.map((c, idx) => (
                <div key={idx} className="intro-chip intro-drift" style={{ ...c.style, animationDelay: c.delay }}>
                  {c.text} <b>{c.sub}</b>
                </div>
              ))}
            </div>
          )}

          {n === 1 && (
            <div className="intro-canvas">
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
              {PLAN_CARDS.map((card, idx) => (
                <div key={idx} className="intro-card" style={{ "--i": idx }}>
                  <h3>{card.title}</h3>
                  <p className="intro-meta">{card.meta}</p>
                  <div className="intro-who">
                    {card.who.map((w, wi) => (
                      <span key={wi} className={`intro-pill ${w.yes ? "yes" : ""}`}>
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

      <div className="intro-tap">
        <button aria-label="Previous" onClick={() => go(-1)} />
        <button aria-label="Next" onClick={() => go(1)} />
      </div>
      <div className="intro-wordmark">
        <SyncMark size={16} />
        <span>SYNC</span>
      </div>
      <button className="intro-skip" onClick={finish}>Skip</button>
    </div>
  );
}
