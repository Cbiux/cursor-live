"use client";

import Image from "next/image";
import { usePreferences, type Locale, type Theme } from "@/lib/preferences";

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "segment active" : "segment"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function AppHeader() {
  const { locale, theme, setLocale, setTheme } = usePreferences();

  return (
    <header className="pos-header">
      <div className="pos-topbar">
        <div className="pos-toggles">
          <SegmentedControl<Locale>
            ariaLabel="Idioma"
            value={locale}
            onChange={setLocale}
            options={[
              { value: "es", label: "Español" },
              { value: "en", label: "English" },
            ]}
          />
          <SegmentedControl<Theme>
            ariaLabel="Tema"
            value={theme}
            onChange={setTheme}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </div>

        <a
          className="credits-badge"
          href="https://github.com/cbiux"
          target="_blank"
          rel="noreferrer"
        >
          <Image
            src="/CUBE_2D_LIGHT.svg"
            alt=""
            width={16}
            height={18}
            className="credits-cube"
          />
          <span>
            {locale === "es" ? "Creado por" : "Created by"}{" "}
            <strong>cbiux</strong>
          </span>
        </a>
      </div>
    </header>
  );
}
