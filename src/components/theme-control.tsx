"use client";
import { useEffect, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
export type ThemePreference = "light" | "dark" | "system";
const key = "fintrack.theme";
function snapshot(): ThemePreference {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" || value === "system"
      ? value
      : "system";
  } catch {
    const fallback = document.documentElement.dataset.themePreference;
    return fallback === "light" || fallback === "dark" ? fallback : "system";
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("fintrack-theme", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("fintrack-theme", listener);
  };
}
export function ThemeRuntime() {
  const theme = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "system" as ThemePreference,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          getComputedStyle(document.documentElement)
            .getPropertyValue("--background")
            .trim(),
        );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
export function ThemeControl() {
  const theme = useSyncExternalStore(
    subscribe,
    snapshot,
    () => "system" as ThemePreference,
  );
  function change(value: ThemePreference) {
    document.documentElement.setAttribute("data-theme-preference", value);
    try {
      localStorage.setItem(key, value);
    } catch {}
    window.dispatchEvent(new Event("fintrack-theme"));
  }
  return (
    <div className="theme-switch" role="group" aria-label="Tema aplicației">
      {(
        [
          ["light", "Temă luminoasă", Sun],
          ["dark", "Temă întunecată", Moon],
          ["system", "Tema dispozitivului", Monitor],
        ] as const
      ).map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={theme === value}
          onClick={() => change(value)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
export function CurrencyPreference() {
  const currency = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem("fintrack.report-currency") === "EUR"
          ? "EUR"
          : "MDL";
      } catch {
        return "MDL";
      }
    },
    () => "MDL",
  );
  return (
    <label>
      Moneda implicită a rapoartelor
      <select
        value={currency}
        onChange={(e) => {
          const value = e.target.value;
          try {
            localStorage.setItem("fintrack.report-currency", value);
          } catch {}
          document.cookie = `fintrack-report-currency=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
          window.dispatchEvent(new Event("fintrack-theme"));
        }}
      >
        <option value="MDL">MDL · Leu moldovenesc</option>
        <option value="EUR">EUR · Euro</option>
      </select>
      <small>
        Preferință pentru acest dispozitiv. Conturile își păstrează moneda; nu
        se fac conversii.
      </small>
    </label>
  );
}
