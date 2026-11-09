import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  Kanban,
  Users,
  UserCog,
  Moon,
  ShieldCheck,
  Sun,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { useAts } from "@/lib/ats-store";
import { useTheme } from "@/lib/theme";
import { AmbientBackground, Avatar, Logo } from "@/components/shared";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function useNavItems() {
  const { currentUser, can } = useAts();
  return [
    ...(currentUser?.role === "admin"
      ? [{ to: "/admin" as const, label: "Admin", icon: ShieldCheck, main: false }]
      : []),
    { to: "/board" as const, label: "Flöde", icon: Kanban, main: true },
    { to: "/candidates" as const, label: "Kandidater", icon: Users, main: false },
    ...(can("manageTeam")
      ? [{ to: "/team" as const, label: "Team", icon: UserCog, main: false }]
      : []),
    { to: "/tjanster" as const, label: "Tjänster", icon: Briefcase, main: false },
  ];
}

function BottomNav() {
  const items = useNavItems();
  // Bottom bar order is explicit; items hidden by role or permission drop out on their own.
  // Admin is not in the bar — admins reach /admin from the profile menu instead.
  const order = ["/tjanster", "/team", "/candidates", "/board"] as const;
  const ordered = order.flatMap((to) => {
    const item = items.find((i) => i.to === to);
    return item ? [item] : [];
  });
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-x-0 border-b-0 px-2 pb-[env(safe-area-inset-bottom)] sm:hidden">
      {ordered.map((item) =>
        item.main ? (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#5d5fe7] to-[#7948c2] text-white shadow-sm transition"
            activeProps={{ className: "ring-2 ring-primary/60 shadow-lg" }}
          >
            <item.icon className="h-6 w-6" />
          </Link>
        ) : (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-surface-high"
            activeProps={{ className: "!text-primary bg-primary/10" }}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        ),
      )}
    </nav>
  );
}

function Nav() {
  const items = useNavItems();
  return (
    <nav className="hidden sm:flex min-w-0 flex-row items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          aria-label={item.label}
          title={item.label}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 font-display text-[13px] font-semibold text-muted-foreground transition hover:bg-surface-high hover:text-foreground"
          activeProps={{ className: "nav-active !text-foreground [&_svg]:text-primary" }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function ProfileMenu() {
  const { currentUser, logout } = useAts();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  if (!currentUser) return null;
  const isAdmin = currentUser.role === "admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Profilmeny"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface-low p-1.5 transition sm:pr-2 hover:bg-surface-high"
        >
          {isAdmin ? (
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#7f1d1d] to-[#b91c1c] text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
            </div>
          ) : (
            <Avatar name={currentUser.name} size="sm" />
          )}
          <span className="hidden max-w-32 truncate font-display text-[13px] font-semibold sm:block">
            {currentUser.name}
          </span>
          <ChevronsUpDown className="hidden h-4 w-4 shrink-0 text-faint sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel className="truncate text-[11px] font-normal text-muted-foreground">
          {currentUser.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="font-display font-semibold">
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toggle();
          }}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Tema: {theme === "dark" ? "Mörkt" : "Ljust"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" /> Logga ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CustomerBanner() {
  const { currentUser, organizations, selectOrg, selectedOrgId } = useAts();
  if (currentUser?.role !== "admin") return null;
  if (organizations.length === 0) {
    return (
      <Link
        to="/admin"
        className="flex min-w-0 shrink items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary transition hover:bg-primary/15"
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="truncate">Inga organisationer ännu · Skapa i Admin</span>
      </Link>
    );
  }
  return (
    <div className="flex min-w-0 shrink items-center">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-primary/25 bg-primary/10 py-1 pl-3 pr-1 text-[12px]">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
        </span>
        <span className="hidden truncate text-muted-foreground lg:inline">Du agerar som </span>
        <Select value={selectedOrgId ?? ""} onValueChange={selectOrg}>
          <SelectTrigger
            className="h-6 w-auto shrink-0 gap-2 rounded-full border-0 bg-transparent px-1 text-[12px] shadow-none focus:ring-0"
            aria-label="Byt kund"
          >
            <SelectValue placeholder="Byt kund" />
          </SelectTrigger>
          <SelectContent align="end">
            {organizations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser } = useAts();
  const isAdmin = currentUser?.role === "admin";
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <AmbientBackground />
      <header
        className={cn(
          "glass sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 px-4 lg:px-8",
          isAdmin && "admin-bar",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Logo className="shrink-0" />
          <Nav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CustomerBanner />
          <ProfileMenu />
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:pb-6 lg:px-8 lg:py-8">{children}</main>
      <BottomNav />
    </div>
  );
}
