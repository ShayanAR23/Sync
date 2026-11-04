"use client";

import { useId } from "react";

// Each pose moves the (deliberately detached, floating) hands somewhere new,
// swaps the eye expression, and gives the body a little tilt — small, cheap
// changes that read as real personality shifts between tour steps instead of
// the same static icon every time.
const POSES = {
  default: { rotate: 0, leftHand: { cx: 16, cy: 100 }, rightHand: { cx: 146, cy: 96 }, eyes: "open", extra: null },
  point: { rotate: -6, leftHand: { cx: 8, cy: 106 }, rightHand: { cx: 128, cy: 34 }, eyes: "open", extra: "sparkle" },
  wave: { rotate: 5, leftHand: { cx: 9, cy: 56 }, rightHand: { cx: 151, cy: 50 }, eyes: "happy", extra: null },
  party: { rotate: -4, leftHand: { cx: 12, cy: 102 }, rightHand: { cx: 150, cy: 92 }, eyes: "wink", extra: "confetti" },
  chat: { rotate: 6, leftHand: { cx: 42, cy: 64 }, rightHand: { cx: 148, cy: 98 }, eyes: "open", extra: "bubble" },
  tickled: { rotate: 0, leftHand: { cx: 32, cy: 74 }, rightHand: { cx: 128, cy: 72 }, eyes: "happy", extra: "laugh" },
};

export function Saamy({ size = 72, bob = false, pose = "default", className = "" }) {
  const uid = useId().replace(/:/g, "");
  const bodyG = `saamy-body-${uid}`;
  const blur1 = `saamy-blur1-${uid}`;
  const blur2 = `saamy-blur2-${uid}`;
  const p = POSES[pose] || POSES.default;

  return (
    <svg
      width={size}
      height={size * (170 / 160)}
      viewBox="0 0 160 170"
      fill="none"
      className={`${bob ? "intro-bob" : ""} ${className}`.trim()}
    >
      <defs>
        <radialGradient id={bodyG} cx="34%" cy="22%" r="90%">
          <stop offset="0%" stopColor="#F0C089" />
          <stop offset="32%" stopColor="#C96B3E" />
          <stop offset="68%" stopColor="#A4502C" />
          <stop offset="100%" stopColor="#6E2F18" />
        </radialGradient>
        <filter id={blur1} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id={blur2} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" /></filter>
      </defs>

      {/* sparkle accents */}
      <path d="M28 44 l2.2 5.6 5.6 2.2 -5.6 2.2 -2.2 5.6 -2.2-5.6-5.6-2.2 5.6-2.2z" fill="#F0C089" opacity="0.85" filter={`url(#${blur2})`} />
      <circle cx="132" cy="108" r="3" fill="#F0C089" opacity="0.8" filter={`url(#${blur2})`} />

      {/* a real contact shadow directly beneath him, nothing around him */}
      <ellipse cx="80" cy="149" rx="40" ry="9" fill="#000000" opacity="0.55" filter={`url(#${blur2})`} />

      {/* floating stub hands, detached from the body — repositioned per pose */}
      <circle cx={p.leftHand.cx} cy={p.leftHand.cy} r="9" fill={`url(#${bodyG})`} />
      <circle cx={p.rightHand.cx} cy={p.rightHand.cy} r="9" fill={`url(#${bodyG})`} />

      {p.extra === "sparkle" && (
        <path d="M128 18 l2 5 5 2 -5 2 -2 5 -2-5-5-2 5-2z" fill="#F0C089" opacity="0.9" filter={`url(#${blur2})`} />
      )}
      {p.extra === "confetti" && (
        <>
          <rect x="24" y="10" width="5" height="5" rx="1" fill="var(--marigold, #A9835A)" transform="rotate(18 26 12)" />
          <circle cx="112" cy="8" r="3" fill="#6B9E9C" />
          <rect x="96" y="22" width="4" height="4" rx="1" fill="#A6728A" transform="rotate(-20 98 24)" />
          <circle cx="40" cy="4" r="2.4" fill="#6B9E9C" />
        </>
      )}
      {p.extra === "bubble" && (
        <g>
          <path d="M120 16 h28 a6 6 0 0 1 6 6 v12 a6 6 0 0 1 -6 6 h-14 l-8 8 2-8 h-8 a6 6 0 0 1 -6 -6 v-12 a6 6 0 0 1 6 -6 Z" fill="#F3F0E8" opacity="0.95" />
          <circle cx="129" cy="28" r="1.8" fill="#8A7558" />
          <circle cx="136" cy="28" r="1.8" fill="#8A7558" />
          <circle cx="143" cy="28" r="1.8" fill="#8A7558" />
        </g>
      )}
      {p.extra === "laugh" && (
        <g stroke="#F0C089" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.85">
          <path d="M14 36q6 -4 12 0" />
          <path d="M18 48q6 -3 11 1" />
          <path d="M134 32q6 -4 12 0" />
          <path d="M138 46q6 -3 11 1" />
        </g>
      )}

      <g style={{ transformBox: "fill-box", transformOrigin: "50% 50%", transform: `rotate(${p.rotate}deg)` }}>
        {/* top fin/sprout, breaks the egg silhouette */}
        <path d="M58 26 C54 10 66 2 76 8 C70 14 68 22 66 30 Z" fill={`url(#${bodyG})`} />

        {/* body: lopsided blob, flat-ish wide base, asymmetric top — not a circle or egg */}
        <path
          d="M70 20
             C98 16 124 32 130 60
             C136 90 126 122 98 136
             C76 147 46 144 30 126
             C14 108 12 78 22 54
             C32 30 50 24 70 20 Z"
          fill={`url(#${bodyG})`}
        />

        {/* top highlight, same hue, just lighter — shading, not a second color */}
        <ellipse cx="56" cy="46" rx="26" ry="16" fill="#F0C089" opacity="0.45" filter={`url(#${blur1})`} />

        {/* eyebrows */}
        <path d="M56 70q7 -8 15 -4" stroke="#3A1B0D" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M92 66q8 -4 15 4" stroke="#3A1B0D" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* eyes — open (dot + glint), happy (closed ^^), or a wink (one of each) */}
        {p.eyes === "happy" ? (
          <>
            <path d="M58 87q8 -9 16 0" stroke="#2B1608" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M92 85q8 -9 16 0" stroke="#2B1608" strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        ) : p.eyes === "wink" ? (
          <>
            <path d="M58 87q8 -9 16 0" stroke="#2B1608" strokeWidth="3" strokeLinecap="round" fill="none" />
            <ellipse cx="100" cy="84" rx="5.4" ry="6.6" fill="#2B1608" />
            <circle cx="102" cy="80.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
          </>
        ) : (
          <>
            <ellipse cx="66" cy="86" rx="5.4" ry="6.6" fill="#2B1608" />
            <ellipse cx="100" cy="84" rx="5.4" ry="6.6" fill="#2B1608" />
            <circle cx="68" cy="82.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
            <circle cx="102" cy="80.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
          </>
        )}

        {/* cheeks */}
        <circle cx="52" cy="98" r="7" fill="#E8744A" opacity="0.25" filter={`url(#${blur1})`} />
        <circle cx="116" cy="96" r="7" fill="#E8744A" opacity="0.25" filter={`url(#${blur1})`} />

        {/* smile */}
        <path d="M72 104q10 8 20 0" stroke="#3A1B0D" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />

        {/* round glasses */}
        <circle cx="66" cy="86" r="11.5" fill="none" stroke="#1C1E22" strokeWidth="2.6" />
        <circle cx="100" cy="84" r="11.5" fill="none" stroke="#1C1E22" strokeWidth="2.6" />
        <path d="M77 85q6 -4 12 -2" stroke="#1C1E22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M55 83q-6 -2 -10 2" stroke="#1C1E22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M111 81q6 -3 9 2" stroke="#1C1E22" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="62" cy="81" r="2" fill="#FFFFFF" opacity="0.35" />
        <circle cx="96" cy="79" r="2" fill="#FFFFFF" opacity="0.35" />
      </g>
    </svg>
  );
}
