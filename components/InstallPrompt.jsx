"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "sync-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

// A small, dismissible install hint: a real "Install" button wherever the
// browser supports beforeinstallprompt (Chrome/Android/desktop), or a short
// "Share > Add to Home Screen" instruction on iOS Safari, which has no such
// API. Shows nothing once the app is already installed, or once dismissed.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    setDismissed(false);

    if (isIos()) {
      setShowIosHint(true);
      return;
    }
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "calc(100vw - 32px)",
        padding: "10px 14px",
        borderRadius: 12,
        background: "#131418",
        border: "1px solid #27292E",
        boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        color: "#F3F4F6",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
      }}
    >
      {showIosHint ? (
        <span>Install Sync: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</span>
      ) : (
        <>
          <span>Install Sync for quicker access.</span>
          <button
            onClick={install}
            style={{ background: "#A9835A", color: "#F3F4F6", border: 0, borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}
          >
            Install
          </button>
        </>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: "transparent", border: 0, color: "#86898F", fontSize: 16, lineHeight: 1, cursor: "pointer", padding: 0, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}
