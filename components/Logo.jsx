// Sync brand mark: two rounded diagonal bars with two dots, echoing the
// reference lockup (dot / bar / dot / bar over a wordmark + caption).
// Used only in the onboarding slideshow — never in the main app chrome.

export function SyncMark({ size = 40, dark = false }) {
  const bar = dark ? "#1D1D1F" : "#FFFFFF";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10.5" cy="10.5" r="3.4" fill={bar} />
      <rect x="16.5" y="6" width="8" height="28" rx="4" transform="rotate(28 20.5 20)" fill={bar} />
      <circle cx="29.5" cy="10.5" r="3.4" fill={bar} />
      <rect x="27" y="6" width="8" height="28" rx="4" transform="rotate(28 31 20)" fill={bar} />
    </svg>
  );
}

export function SyncLogo({ tagline = "close the distance, one day at a time", dark = false }) {
  const fg = dark ? "#1D1D1F" : "#FFFFFF";
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center mb-5"
        style={{ width: 92, height: 92, borderRadius: 26, background: dark ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.16)", boxShadow: dark ? "none" : "0 18px 40px rgba(0,0,0,0.18)" }}
      >
        <SyncMark size={48} dark={dark} />
      </div>
      <p style={{ color: fg, fontWeight: 800, fontSize: 26, letterSpacing: 6, lineHeight: 1 }}>SYNC</p>
      <p style={{ color: fg, opacity: 0.75, fontWeight: 600, fontSize: 11, letterSpacing: 1.5, marginTop: 8, textTransform: "uppercase" }}>{tagline}</p>
    </div>
  );
}
