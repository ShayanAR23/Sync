"use client";

import { useRef } from "react";
import { Monkey } from "./Monkey";
import { defaultLookFor } from "./monkeyData";

// Curated "bitmoji-style" sticker set — a person picks one of these, or
// uploads their own photo, or falls back to their initial letter.
export const AVATAR_EMOJIS = [
  "😀", "😎", "🥳", "🤠", "🥸", "🤓", "😇", "🙂",
  "😺", "🐶", "🦊", "🐻", "🐼", "🐨", "🦁", "🐸",
  "🦄", "🐵", "🐧", "🦉", "🐢", "🐙", "🌵", "🍕",
];

function downscaleImage(file, maxSize = 160) {
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

// Shared squircle renderer: photo > emoji sticker > their plush monkey (the
// default — Saamy's own cast of look-alikes, one per person). A fixed (not
// proportional) corner radius keeps real corners visible at every size
// instead of rounding all the way into a circle.
export function Avatar({ person, size = 32, ring }) {
  if (!person) return null;
  const monkeyLook = person.monkey || defaultLookFor(person.id || person.name);
  const style = {
    width: size,
    height: size,
    minWidth: size,
    background: person.avatarPhoto ? "transparent" : person.color,
    color: "var(--on-accent)",
    fontSize: person.avatarEmoji ? size * 0.62 : size * 0.42,
    fontWeight: 600,
    overflow: "hidden",
    borderRadius: Math.max(4, size * 0.2),
    boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
  };
  return (
    <span className="inline-flex items-center justify-center flex-shrink-0" style={style}>
      {person.avatarPhoto ? (
        <img src={person.avatarPhoto} alt={person.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : person.avatarEmoji ? (
        <span>{person.avatarEmoji}</span>
      ) : (
        <span style={{ display: "block", width: size, height: size, lineHeight: 0 }}>
          <Monkey look={monkeyLook} size={size} crop="bust" />
        </span>
      )}
    </span>
  );
}

// Emoji grid + photo upload, used inside a person's "customize" panel.
export function AvatarPicker({ person, onChange }) {
  const fileRef = useRef(null);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await downscaleImage(file);
      onChange({ avatarPhoto: dataUrl, avatarEmoji: null });
    } catch {
      // unreadable file — ignore silently, nothing changes
    }
  };
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Avatar person={person} size={44} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs rounded-lg px-3 py-1.5"
            style={{ background: "var(--ink-3)", color: "var(--paper)" }}
          >
            Upload photo
          </button>
          {(person.avatarPhoto || person.avatarEmoji) && (
            <button
              onClick={() => onChange({ avatarPhoto: null, avatarEmoji: null })}
              className="text-xs"
              style={{ color: "var(--mist)" }}
            >
              Use monkey
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AVATAR_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onChange({ avatarEmoji: e, avatarPhoto: null })}
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 30,
              height: 30,
              fontSize: 16,
              background: person.avatarEmoji === e ? "var(--ink-3)" : "transparent",
              border: `1px solid ${person.avatarEmoji === e ? person.color : "var(--ink-4)"}`,
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
