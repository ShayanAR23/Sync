"use client";

import { useEffect, useRef, useState } from "react";
import { Saamy } from "./Mascot";

// Spotlight walkthrough shown once a new user lands in the real app —
// Saamy points at the actual nav tabs / add button / settings icon
// (matched via data-tour="..." attributes scattered through SyncApp.jsx
// and PhoneShell.jsx) instead of describing them abstractly like the
// pre-signup IntroStory tour slides do.
export const TOUR_STEPS = [
  { tab: "groups", target: "tour-mascot", title: "Hey, I'm Saamy", body: "Give me 30 seconds and I'll show you around the app.", pose: "default" },
  { tab: "groups", target: "tour-tab-groups", title: "My Calendar", body: "Your personal calendar. Tap any day to mark it free, tentative, or add an event.", pose: "point" },
  { tab: "groups", target: "tour-fab", title: "Add something", body: "Tap here anytime to add an event or propose a plan to friends.", pose: "party" },
  { tab: "friends", target: "tour-tab-friends", title: "Friends Calendars", body: "Compare availability with friends and groups, then spot the best time to get together.", pose: "wave" },
  { tab: "plans", target: "tour-tab-plans", title: "Plans", body: "Propose a date, track who's in, and watch it lock in.", pose: "party" },
  { tab: "messages", target: "tour-tab-messages", title: "Messages", body: "Chat through the details without ever leaving the app.", pose: "chat" },
  { tab: "groups", target: "tour-settings", title: "Make it yours", body: "Switch themes, change your wallpaper, and manage your profile from here.", pose: "default" },
];

export function AppTour({ tab, setTab, onFinish }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [containerH, setContainerH] = useState(0);
  const containerRef = useRef(null);
  const current = TOUR_STEPS[step];

  useEffect(() => {
    if (current.tab && current.tab !== tab) setTab(current.tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    let raf1, raf2;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      const container = containerRef.current;
      if (el && container) {
        const r = el.getBoundingClientRect();
        const c = container.getBoundingClientRect();
        setRect({ left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height });
        setContainerH(c.height);
      } else {
        setRect(null);
      }
    };
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(measure); });
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); window.removeEventListener("resize", measure); };
  }, [step, tab]);

  const last = step === TOUR_STEPS.length - 1;
  const finishTour = () => { setTab("groups"); onFinish(); };
  const next = () => (last ? finishTour() : setStep((s) => s + 1));

  const pad = 8;
  const spotStyle = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : { left: -9999, top: -9999, width: 0, height: 0 };

  const placeAbove = rect ? rect.top > containerH / 2 : false;
  const cardStyle = rect
    ? placeAbove
      ? { bottom: containerH - rect.top + pad + 14 }
      : { top: rect.top + rect.height + pad + 14 }
    : { top: "42%" };

  return (
    <div ref={containerRef} className="sync-tour-layer">
      <div className="sync-tour-catcher" />
      <div className="sync-tour-spot" style={spotStyle} />
      <div className="sync-tour-card" style={cardStyle}>
        <div className="sync-tour-head">
          <span key={step} className="sync-tour-mascot-pop"><Saamy size={34} pose={current.pose} /></span>
          <p className="sync-tour-title">{current.title}</p>
          <button className="sync-tour-skip" onClick={finishTour}>Skip</button>
        </div>
        <p className="sync-tour-body">{current.body}</p>
        <div className="sync-tour-foot">
          <div className="sync-tour-dots">
            {TOUR_STEPS.map((_, n) => <span key={n} className={n === step ? "on" : ""} />)}
          </div>
          <button className="sync-tour-next" onClick={next}>{last ? "Got it" : "Next"}</button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .sync-tour-layer { position:absolute; inset:0; z-index:70; }
        .sync-tour-catcher { position:absolute; inset:0; }
        .sync-tour-spot {
          position:absolute; border-radius:14px;
          box-shadow:0 0 0 2000px rgba(5,6,8,0.74), 0 0 0 2px rgba(169,131,90,0.55);
          transition: left 360ms cubic-bezier(.22,1,.36,1), top 360ms cubic-bezier(.22,1,.36,1), width 360ms cubic-bezier(.22,1,.36,1), height 360ms cubic-bezier(.22,1,.36,1);
          pointer-events:none;
        }
        .sync-tour-card {
          position:absolute; left:16px; right:16px;
          background:var(--ink-2); border:1px solid var(--ink-4); border-radius:12px;
          padding:16px; box-shadow:0 12px 30px rgba(0,0,0,0.5);
          transition: top 360ms cubic-bezier(.22,1,.36,1), bottom 360ms cubic-bezier(.22,1,.36,1);
          animation: sync-fade 220ms ease both;
        }
        .sync-tour-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
        .sync-tour-mascot-pop { display:block; animation:sync-tour-mascot-pop 420ms cubic-bezier(.22,1,.36,1) both; }
        @keyframes sync-tour-mascot-pop { from { opacity:0; transform:scale(0.6) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .sync-tour-title { flex:1; font-family:'Inter',sans-serif; font-weight:800; font-size:15px; color:var(--paper); letter-spacing:-0.01em; }
        .sync-tour-skip { border:0; background:transparent; color:var(--mist); font-size:11.5px; font-weight:600; cursor:pointer; padding:4px; }
        .sync-tour-body { font-size:12.5px; line-height:1.55; color:var(--mist); margin:0 0 14px; font-weight:500; }
        .sync-tour-foot { display:flex; align-items:center; justify-content:space-between; }
        .sync-tour-dots { display:flex; gap:5px; }
        .sync-tour-dots span { width:5px; height:5px; border-radius:50%; background:var(--ink-4); display:block; }
        .sync-tour-dots span.on { background:var(--marigold); width:14px; border-radius:3px; }
        .sync-tour-next {
          border:0; border-radius:8px; background:var(--marigold); color:var(--on-accent);
          font-family:'Inter',sans-serif; font-weight:800; font-size:12.5px; letter-spacing:0.03em;
          text-transform:uppercase; padding:9px 16px; cursor:pointer; transition:transform 120ms ease;
        }
        .sync-tour-next:active { transform:scale(0.96); }
        @media (prefers-reduced-motion: reduce) {
          .sync-tour-spot, .sync-tour-card { transition:none !important; animation:none !important; }
        }
      `}} />
    </div>
  );
}
