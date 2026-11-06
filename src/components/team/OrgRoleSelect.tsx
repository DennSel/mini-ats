import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_ROLES, type OrgRole } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function OrgRoleSelect({
  value,
  onChange,
  className,
}: {
  value: OrgRole;
  onChange: (r: OrgRole) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as OrgRole)}>
      <SelectTrigger className={cn("h-10 rounded-xl border-border bg-surface-low", className)} aria-label="Roll">
        <SelectValue>{ORG_ROLES.find((r) => r.id === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {ORG_ROLES.map((r) => (
          <SelectItem key={r.id} value={r.id}>
            <div className="flex flex-col items-start">
              <span>{r.label}</span>
              <span className="text-[10px] text-muted-foreground">{r.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
