"use client";

import { useRef } from "react";

// A handful of gradient presets so people don't have to upload a photo
// just to make their calendar or wallpaper feel personal.
export const BACKGROUND_PRESETS = [
  "linear-gradient(160deg, #FF9A3D 0%, #FF7A1A 55%, #F2650A 100%)",
  "linear-gradient(160deg, #6E9FC1 0%, #4A7FA6 100%)",
  "linear-gradient(160deg, #B98CC1 0%, #8C5C9E 100%)",
  "linear-gradient(160deg, #5FA8A0 0%, #337A72 100%)",
  "linear-gradient(160deg, #D07A8C 0%, #A84C60 100%)",
];

function downscaleImage(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// value: either a data URL (uploaded photo) or one of BACKGROUND_PRESETS (gradient), or null.
export function BackgroundPicker({ value, onChange, label = "Background" }) {
  const fileRef = useRef(null);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange(await downscaleImage(file));
    } catch {
      // unreadable file — ignore silently, nothing changes
    }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs mono" style={{ color: "var(--mist)" }}>{label}</p>
        {value && <button onClick={() => onChange(null)} className="text-xs" style={{ color: "var(--mist)" }}>Remove</button>}
      </div>
      <div
        className="rounded-2xl mb-3"
        style={{ height: 64, background: value || "var(--ink-3)", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--ink-3)" }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="text-xs rounded-full px-3 py-1.5" style={{ background: "var(--ink-3)", color: "var(--paper)" }}>
          Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        {BACKGROUND_PRESETS.map((g, i) => (
          <button
            key={i}
            onClick={() => onChange(g)}
            className="rounded-full"
            style={{ width: 24, height: 24, background: g, boxShadow: value === g ? "0 0 0 2px var(--ink), 0 0 0 4px var(--marigold)" : "none" }}
          />
        ))}
      </div>
    </div>
  );
}
