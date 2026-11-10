"use client";

import { Monkey } from "./Monkey";
import { DEFAULT_LOOK } from "./monkeyData";

// Saamy is our plush monkey (see Monkey.jsx / monkeyData.js) wearing a fixed
// "look" so he's always recognizably himself. Each pose nudges that look
// (a prop to hold, a glasses swap) and tilts him a little, then layers on a
// small decorative extra — small, cheap changes that read as real
// personality shifts between tour steps instead of the same static icon
// every time.
const POSES = {
  default: { rotate: 0, look: {}, extra: null },
  point: { rotate: -6, look: {}, extra: "sparkle" },
  wave: { rotate: 6, look: { held: "Balloon" }, extra: null },
  party: { rotate: -4, look: { eyes: "Heart glasses", held: "Balloon" }, extra: "confetti" },
  chat: { rotate: 5, look: {}, extra: "bubble" },
  tickled: { rotate: 0, look: { eyes: "Heart glasses" }, extra: "laugh" },
};

export function Saamy({ size = 72, bob = false, pose = "default", className = "" }) {
  const p = POSES[pose] || POSES.default;
  const look = { ...DEFAULT_LOOK, ...p.look };
  const crop = size <= 44 ? "bust" : null;

  return (
    <span className={`${bob ? "intro-bob" : ""} ${className}`.trim()} style={{ position: "relative", display: "inline-block" }}>
      <span style={{ display: "inline-block", transform: `rotate(${p.rotate}deg)`, transformOrigin: "50% 85%" }}>
        <Monkey look={look} size={size} crop={crop} />
      </span>

      {p.extra === "sparkle" && (
        <svg width={size * 0.3} height={size * 0.3} viewBox="0 0 20 20" style={{ position: "absolute", top: "-6%", right: "-6%", pointerEvents: "none" }}>
          <path d="M10 1 l2 6 6 2 -6 2 -2 6 -2-6-6-2 6-2z" fill="#F0C089" opacity="0.9" />
        </svg>
      )}
      {p.extra === "confetti" && (
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <rect x="6" y="4" width="7" height="7" rx="1.5" fill="#A9835A" transform="rotate(18 9 7)" />
          <circle cx="82" cy="4" r="4" fill="#6B9E9C" />
          <rect x="70" y="16" width="6" height="6" rx="1.5" fill="#A6728A" transform="rotate(-20 73 19)" />
          <circle cx="30" cy="2" r="3" fill="#6B9E9C" />
        </svg>
      )}
      {p.extra === "bubble" && (
        <svg width={size * 0.6} height={size * 0.42} viewBox="0 0 70 46" style={{ position: "absolute", top: "-16%", right: "-32%", pointerEvents: "none" }}>
          <path d="M8 2 h54 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-30 l-10 10 2-10 h-16 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6 Z" fill="#F3F0E8" opacity="0.95" />
          <circle cx="20" cy="17" r="2.6" fill="#8A7558" />
          <circle cx="32" cy="17" r="2.6" fill="#8A7558" />
          <circle cx="44" cy="17" r="2.6" fill="#8A7558" />
        </svg>
      )}
      {p.extra === "laugh" && (
        <svg width={size} height={size * 0.5} viewBox="0 0 100 50" style={{ position: "absolute", top: "26%", left: 0, pointerEvents: "none" }}>
          <g stroke="#F0C089" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85">
            <path d="M6 18q8 -6 16 0" />
            <path d="M12 32q8 -4 15 1" />
            <path d="M78 18q8 -6 16 0" />
            <path d="M84 32q8 -4 15 1" />
          </g>
        </svg>
      )}
    </span>
  );
}
