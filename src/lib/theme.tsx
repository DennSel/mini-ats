import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";
const KEY = "ats-theme";

/** Runs before paint (inlined in <head>) so the stored theme applies without a flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'){document.documentElement.classList.remove('dark');}}catch(e){}})();`;

const tg = globalThis as unknown as { __themeContext?: React.Context<{ theme: Theme; toggle: () => void }> };
const ThemeContext = (tg.__themeContext ??= createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
}));

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "light") setTheme("light");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
