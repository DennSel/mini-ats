import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, Kanban, Users, UserCog, Moon, ShieldCheck, Sun, LogOut, ChevronsUpDown, Menu } from "lucide-react";
import { useAts } from "@/lib/ats-store";
import { useTheme } from "@/lib/theme";
import { AmbientBackground, Avatar, Logo } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function useNavItems() {
  const { currentUser, can } = useAts();
  return [
    { to: "/jobs" as const, label: "Jobb", icon: Briefcase },
    { to: "/board" as const, label: "Pipeline", icon: Kanban },
    { to: "/candidates" as const, label: "Kandidater", icon: Users },
    ...(can("manageTeam") ? [{ to: "/team" as const, label: "Team", icon: UserCog }] : []),
    ...(currentUser?.role === "admin" ? [{ to: "/admin" as const, label: "Admin", icon: ShieldCheck }] : []),
  ];
}

function MobileNav() {
  const items = useNavItems();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Meny"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-low transition hover:bg-surface-high sm:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-xl">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link
              to={item.to}
              className="font-display font-semibold"
              activeProps={{ className: "text-primary [&_svg]:text-primary" }}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Nav() {
  const items = useNavItems();
  return (
    <nav className="no-scrollbar hidden sm:flex min-w-0 flex-row items-center gap-1 overflow-x-auto">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          aria-label={item.label}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-1.5 font-display text-[13px] font-semibold text-muted-foreground transition hover:bg-surface-high hover:text-foreground"
          activeProps={{ className: "nav-active !text-foreground [&_svg]:text-primary [&_span]:inline" }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{item.label}</span>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Profilmeny"
          className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface-low p-1.5 transition sm:pr-2 hover:bg-surface-high"
        >
          <Avatar name={currentUser.name} size="sm" />
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
  const { currentUser, organizations, activeOrg, selectOrg, selectedOrgId } = useAts();
  if (currentUser?.role !== "admin") return null;
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
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <AmbientBackground />
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-x-0 border-t-0 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Logo className="hidden sm:inline-flex" />
          <MobileNav />
          <Nav />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CustomerBanner />
          <ProfileMenu />
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
