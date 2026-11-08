import { Icon, Minus, Plus, Handshake, Search, X, type LucideProps } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/ats-logic";
import type { Stage, JobStatus } from "@/lib/mock-data";
import * as React from "react";

const buildingComplexPlusNode: [string, Record<string, string>][] = [
  ["path", { d: "M10 12h4", key: "a" }],
  ["path", { d: "M10 21v-3a2 2 0 013.05-1.702", key: "b" }],
  ["path", { d: "M10 8h4", key: "c" }],
  ["path", { d: "M16 19h6", key: "d" }],
  ["path", { d: "M18 7h2a2 2 0 012 2v4.355", key: "e" }],
  ["path", { d: "M19 16v6", key: "f" }],
  ["path", { d: "M6 10H4a2 2 0 00-2 2v7a2 2 0 002 2h8.535", key: "g" }],
  ["path", { d: "M6 21V5a2 2 0 012-2h8a2 2 0 012 2v7.126", key: "h" }],
];

export function BuildingComplexPlus(props: LucideProps) {
  return <Icon iconNode={buildingComplexPlusNode as never} {...props} />;
}

/** Card with a clickable title bar; content hidden until opened (+ / −). */
export function CollapsibleCard({
  title,
  icon,
  children,
  className,
  gradient,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={cn("glass-card h-fit overflow-hidden rounded-2xl", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 text-left font-display font-bold",
          gradient ? "btn-gradient px-4 py-2.5 text-[13px] text-on-primary" : "p-5 text-[15px]",
        )}
      >
        <span className={cn("[&_svg]:h-4 [&_svg]:w-4", !gradient && "text-primary")}>{icon}</span>
        <span className="flex-1">{title}</span>
        {open ? (
          <Minus className={cn("h-4 w-4", !gradient && "text-muted-foreground")} />
        ) : (
          <Plus className={cn("h-4 w-4", !gradient && "text-muted-foreground")} />
        )}
      </button>
      {open && <div className={cn("px-5 pb-5", gradient && "pt-4")}>{children}</div>}
    </div>
  );
}

/** Accepts http(s) in any letter case and normalises the scheme to lowercase. */
export function normalizeUrl(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, (m) => m.toLowerCase());
}

export type LogoProps = React.HTMLAttributes<HTMLDivElement>;

export function Logo({ className, ...props }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)} {...props}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#5d5fe7] to-[#7948c2] text-white shadow-sm">
        <Handshake className="h-4 w-4" />
      </div>
      <span className="font-display text-lg font-bold tracking-tight text-foreground whitespace-nowrap">
        KandSys
      </span>
    </div>
  );
}

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--ambient-1)] blur-[130px]" />
      <div className="absolute right-[-10%] top-1/3 h-[480px] w-[480px] rounded-full bg-[var(--ambient-2)] blur-[130px]" />
      <div className="absolute bottom-[-15%] left-1/3 h-[440px] w-[440px] rounded-full bg-[var(--ambient-3)] blur-[130px]" />
    </div>
  );
}

const avatarGradients = [
  "from-primary-container/80 to-accent-2/70",
  "from-accent-2/80 to-pink/70",
  "from-accent-3/80 to-primary-container/70",
  "from-pink/80 to-accent-2/60",
  "from-primary/80 to-accent-3/70",
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const g = avatarGradients[hash(name) % avatarGradients.length];
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center bg-gradient-to-br font-display font-bold text-on-primary",
        g,
        size === "sm" && "h-8 w-8 rounded-lg text-[11px]",
        size === "md" && "h-9 w-9 rounded-lg text-xs",
        size === "lg" && "h-14 w-14 rounded-xl text-base",
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}

export function CountPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: JobStatus }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        Öppen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-faint/30 bg-surface-high px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-faint" />
      Stängd
    </span>
  );
}

export const stageStyles: Record<
  Stage,
  { dot: string; text: string; pill: string; hoverBorder: string }
> = {
  new: {
    dot: "bg-stage-new",
    text: "text-stage-new",
    pill: "bg-stage-new/10 border-stage-new/20 text-stage-new",
    hoverBorder: "hover:border-stage-new/70",
  },
  screening: {
    dot: "bg-stage-screening",
    text: "text-stage-screening",
    pill: "bg-stage-screening/10 border-stage-screening/20 text-stage-screening",
    hoverBorder: "hover:border-stage-screening/70",
  },
  interview: {
    dot: "bg-stage-interview",
    text: "text-stage-interview",
    pill: "bg-stage-interview/10 border-stage-interview/20 text-stage-interview",
    hoverBorder: "hover:border-stage-interview/70",
  },
  offer: {
    dot: "bg-stage-offer",
    text: "text-stage-offer",
    pill: "bg-stage-offer/10 border-stage-offer/20 text-stage-offer",
    hoverBorder: "hover:border-stage-offer/70",
  },
  hired: {
    dot: "bg-stage-hired",
    text: "text-stage-hired",
    pill: "bg-stage-hired/10 border-stage-hired/20 text-stage-hired",
    hoverBorder: "hover:border-stage-hired/70",
  },
  rejected: {
    dot: "bg-stage-rejected",
    text: "text-stage-rejected",
    pill: "bg-stage-rejected/10 border-stage-rejected/20 text-stage-rejected",
    hoverBorder: "hover:border-stage-rejected/70",
  },
};

export function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return <p className="mt-1 text-[11px] font-medium text-error">{message}</p>;
}

/** Search field with a clear (x) button on the right when it has text. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-10 flex-1 shrink md:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder ?? "Sök"}
        className="h-9 w-full min-w-0 rounded-xl border border-border bg-surface-low pl-9 pr-8 text-[13px] outline-none placeholder:text-faint focus:border-primary/60"
      />
      {value && (
        <button
          type="button"
          aria-label="Rensa sökning"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-faint transition hover:bg-surface-high hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** View title shown at the left of a page's toolbar, like "Medarbetare i <kund>" on Team. */
export function ViewLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("min-w-0 truncate text-[13px] text-muted-foreground", className)}>
      <span className="font-semibold text-foreground">{children}</span>
    </p>
  );
}

export const inputClass =
  "h-10 w-full rounded-xl border border-border bg-surface-low px-3 text-[13px] text-foreground placeholder:text-faint outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

export const labelClass = "mb-1.5 block font-display text-[12px] font-semibold text-foreground";

export function useIsDesktop(minWidth = 1024) {
  const [desktop, setDesktop] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [minWidth]);
  return desktop;
}

/** Page content with a form panel beside it on desktop (pushes page left), a sheet on mobile. */
export function WithSidePanel({
  side,
  title,
  onClose,
  children,
}: {
  side: React.ReactNode | null;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const desktop = useIsDesktop();
  const tablet = useIsDesktop(640) && !desktop;
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
      {tablet && side && (
        <section className="glass-card relative rounded-2xl p-5">
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-high hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
          {side}
        </section>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {desktop && side && (
        <aside className="glass-card relative sticky top-20 max-h-[calc(100vh-6rem)] w-[400px] shrink-0 overflow-y-auto rounded-2xl p-5 animate-in fade-in slide-in-from-right-4">
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-high hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
          {side}
        </aside>
      )}
      {!desktop && !tablet && (
        <Sheet open={!!side} onOpenChange={(o) => !o && onClose()}>
          <SheetContent className="w-full overflow-y-auto border-border bg-surface-lowest p-5 sm:max-w-md">
            <SheetTitle className="mb-4 font-display text-xl font-bold">{title}</SheetTitle>
            {side}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

// Page UI state that survives navigating away and back (module-level, per key).
const uiGlobal = globalThis as unknown as { __atsUiStore?: Map<string, unknown> };
const uiStore: Map<string, unknown> = (uiGlobal.__atsUiStore ??= new Map());
export function usePersistentState<T>(key: string, initial: T) {
  const [v, setV] = React.useState<T>(() => (uiStore.has(key) ? (uiStore.get(key) as T) : initial));
  const set = React.useCallback(
    (next: T | ((p: T) => T)) =>
      setV((p) => {
        const n = typeof next === "function" ? (next as (p: T) => T)(p) : next;
        uiStore.set(key, n);
        return n;
      }),
    [key],
  );
  return [v, set] as const;
}
