export const metadata = {
  title: "You're offline — Sync",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        textAlign: "center",
        padding: 24,
        background: "#0A0B0D",
        color: "#F3F4F6",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>You're offline</h1>
      <p style={{ color: "#86898F", maxWidth: 320, margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        Sync needs a connection to load new data. Reconnect and try again — anything you already had open keeps working.
      </p>
    </main>
  );
}
