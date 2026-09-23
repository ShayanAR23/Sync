"use client";

import { useRef } from "react";

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

// Shared circle renderer: photo > emoji sticker > initial letter.
export function Avatar({ person, size = 32, ring }) {
  if (!person) return null;
  const style = {
    width: size,
    height: size,
    minWidth: size,
    background: person.avatarPhoto ? "transparent" : person.color,
    color: "var(--on-accent)",
    fontSize: person.avatarEmoji ? size * 0.62 : size * 0.42,
    fontWeight: 600,
    overflow: "hidden",
    boxShadow: ring ? `0 0 0 2px ${ring}` : "none",
  };
  return (
    <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={style}>
      {person.avatarPhoto ? (
        <img src={person.avatarPhoto} alt={person.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : person.avatarEmoji ? (
        <span>{person.avatarEmoji}</span>
      ) : (
        <span>{person.name.charAt(0)}</span>
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
            className="text-xs rounded-full px-3 py-1.5"
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
              Reset
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
            className="flex items-center justify-center rounded-full"
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
