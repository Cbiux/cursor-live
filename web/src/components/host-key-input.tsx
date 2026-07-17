"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";

export function HostKeyInput({
  value,
  onChange,
  placeholder = "Mín. 4 caracteres",
  className = "inline-field",
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <KeyRound size={15} aria-hidden />
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        aria-label="Clave del host"
      />
      <button
        type="button"
        className="key-visibility-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
        title={visible ? "Ocultar clave" : "Mostrar clave"}
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

export function readRoomHostKey(code: string) {
  if (!code || typeof window === "undefined") return "";
  return window.localStorage.getItem(`cursor-live-host-key:${code}`) ?? "";
}

export function writeRoomHostKey(code: string, key: string) {
  if (!code || typeof window === "undefined") return;
  window.localStorage.setItem(`cursor-live-host-key:${code}`, key);
}
