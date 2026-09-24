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
