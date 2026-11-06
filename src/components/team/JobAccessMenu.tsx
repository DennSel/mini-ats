import { Briefcase, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Job, OrgRole } from "@/lib/mock-data";

/** Owner picks which jobs a team member can see. undefined = all jobs. */
export function JobAccessMenu({
  orgRole,
  jobIds,
  name,
  jobs,
  onChange,
  className,
}: {
  orgRole: OrgRole;
  jobIds: string[] | undefined;
  name?: string;
  jobs: Job[];
  onChange: (jobIds: string[] | undefined) => void;
  className?: string;
}) {
  const btn = "h-10 w-full justify-between rounded-xl sm:w-40 " + (className ?? "");
  if (orgRole === "owner") {
    return (
      <Button type="button" variant="outline" size="sm" disabled className={btn + " disabled:opacity-70"}>
        <span className="flex min-w-0 items-center gap-1.5">
          <Briefcase className="shrink-0" /> <span className="truncate">Alla jobb (ägare)</span>
        </span>
      </Button>
    );
  }
  const selected = jobIds ?? jobs.map((j) => j.id);
  const all = !jobIds;
  const label = all ? "Alla jobb" : `${selected.length} av ${jobs.length} jobb`;
  const toggle = (id: string, on: boolean) => {
    const next = on ? [...selected, id] : selected.filter((x) => x !== id);
    onChange(next.length === jobs.length ? undefined : next);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={btn}>
          <span className="flex min-w-0 items-center gap-1.5">
            <Briefcase className="shrink-0" /> <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px]">{name ? `Jobb ${name.split(" ")[0]} har tillgång till` : "Jobb med tillgång"}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem checked={all} onSelect={(e) => e.preventDefault()} onCheckedChange={() => onChange(all ? [] : undefined)}>
          Alla jobb
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {jobs.map((j) => (
          <DropdownMenuCheckboxItem
            key={j.id}
            checked={selected.includes(j.id)}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(on) => toggle(j.id, !!on)}
          >
            <span className="truncate">{j.title}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
