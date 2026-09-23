"use client";

// Centers the app inside a phone-shaped frame (bezel, notch, home
// indicator) on a soft backdrop — the "vertical app view" the rest of
// SyncApp renders into.
export function PhoneShell({ children, footer, background, themeMode = "dark" }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "radial-gradient(circle at 50% 0%, #2A2A2E 0%, #0B0B0C 65%)" }}
    >
      <div
        className="relative"
        style={{
          width: "min(430px, 100%)",
          height: "min(880px, calc(100vh - 32px))",
          background: "#000",
          borderRadius: 54,
          padding: 14,
          boxShadow: "0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div
          className={`sync-root theme-${themeMode} relative w-full h-full overflow-hidden`}
          style={{ borderRadius: 40, background: background || "var(--ink)", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          {/* status bar / notch */}
          <div className="absolute top-0 left-0 right-0 flex justify-center pt-2.5 z-30 pointer-events-none">
            <div style={{ width: 120, height: 26, borderRadius: 16, background: "#000" }} />
          </div>
          <div className="w-full h-full overflow-y-auto sync-scroll" style={{ paddingTop: 34 }}>
            {children}
          </div>
          {/* pinned footer (bottom tab bar) — a sibling of the scroll area, not inside it,
              so it stays put regardless of how far the content above has scrolled */}
          {footer}
          {/* home indicator */}
          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <div style={{ width: 120, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.35)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Bottom icon tab bar, replacing the old top nav — sits fixed inside the
// phone viewport above the home indicator.
export function BottomTabBar({ tab, setTab, tabs }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-around px-2"
      style={{
        height: 78,
        paddingBottom: 14,
        background: "var(--ink-2)",
        borderTop: "1px solid var(--ink-3)",
      }}
    >
      {tabs.map(({ id, label, icon: Icon, badge }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex flex-col items-center gap-1 flex-1 relative"
            style={{ color: active ? "var(--marigold)" : "var(--mist)" }}
          >
            <span className="relative">
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {badge && <span className="absolute -top-0.5 -right-1 rounded-full" style={{ width: 7, height: 7, background: "var(--sun)" }} />}
            </span>
            <span className="mono" style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
