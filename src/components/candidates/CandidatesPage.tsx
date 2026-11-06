import { useMemo } from "react";
import { usePersistentState } from "@/components/shared";
import { Plus, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { useAts } from "@/lib/ats-store";
import { STAGES, type Candidate } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, stageStyles } from "@/components/shared";
import { cn } from "@/lib/utils";
import { POOL, WithCandidatePanel, useIsDesktop } from "@/components/board/CandidatePanel";
import { CandidateDialog } from "@/components/board/CandidateDialog";

const ALL = "__all";

export function CandidatesPage() {
  const { candidates, jobs, activeOrgId, assignCandidate, can, orgJobs, orgCandidates } = useAts();
  const [jobFilter, setJobFilter] = usePersistentState<string>("cands.job", ALL);
  const [q, setQ] = usePersistentState("cands.q", "");
  const [sort, setSort] = usePersistentState<"recent" | "oldest" | "stage" | "name" | "name-desc">("cands.sort", "recent");
  const [selectedId, setSelectedId] = usePersistentState<string | null>("cands.selected", null);
  const desktop = useIsDesktop();
  const [rawDialog, setDialog] = usePersistentState<{ open: boolean | null; candidate: Candidate | null }>("cands.dialog", { open: null, candidate: null });
  const canMove = can("moveCandidates");
  const canManage = can("manageCandidates");
  const dialog = { candidate: rawDialog.candidate, open: rawDialog.open ?? (desktop && canManage && !selectedId) };

    const orgCands = orgCandidates;
  const query = q.trim().toLowerCase();
  const visible = orgCands.filter(
    (c) =>
      (jobFilter === ALL || (jobFilter === POOL ? c.jobId === null : c.jobId === jobFilter)) &&
      (!query || `${c.name} ${c.email}`.toLowerCase().includes(query)),
  );
  const stageIdx = (c: Candidate) => (c.jobId === null ? STAGES.length : STAGES.findIndex((s) => s.id === c.stage));
  visible.sort((a, b) =>
    sort === "stage"
      ? stageIdx(a) - stageIdx(b) || a.name.localeCompare(b.name, "sv")
      : sort === "name"
        ? a.name.localeCompare(b.name, "sv")
        : sort === "name-desc"
          ? b.name.localeCompare(a.name, "sv")
          : sort === "oldest"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
  );
  const poolCount = orgCands.filter((c) => c.jobId === null).length;
  const jobTitle = (id: string | null) => jobs.find((j) => j.id === id)?.title;

  const send = (c: Candidate, jobId: string | null) => {
    assignCandidate(c.id, jobId);
    toast.success(jobId ? `${c.name} skickades till ${jobTitle(jobId)}` : `${c.name} är nu vilande`);
  };

  const addInline = desktop && dialog.open && !dialog.candidate;
  const closeDialog = (open: boolean) => setDialog((d) => ({ ...d, open }));

  return (
    <WithCandidatePanel
      side={addInline ? <CandidateDialog inline open candidate={null} defaultJobId={jobFilter === ALL ? POOL : jobFilter} onOpenChange={closeDialog} /> : undefined}
      onSideClose={() => closeDialog(false)}
      candidateId={selectedId}
      onClose={() => setSelectedId(null)}
      onEdit={() => {
        const c = candidates.find((x) => x.id === selectedId);
        if (c) setDialog({ open: true, candidate: c });
      }}
    >
      <div className="glass flex flex-col gap-2 rounded-2xl p-2 md:flex-row md:items-center">
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="h-9 rounded-xl border-border bg-surface-low md:w-64" aria-label="Filtrera på jobb">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alla kandidater ({orgCands.length})</SelectItem>
            <SelectItem value={POOL}>Vilande ({poolCount})</SelectItem>
            {orgJobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="h-9 rounded-xl border-border bg-surface-low md:w-44" aria-label="Sortera">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Datum: nyast först</SelectItem>
            <SelectItem value="oldest">Datum: äldst först</SelectItem>
            <SelectItem value="name">Namn A–Ö</SelectItem>
            <SelectItem value="name-desc">Namn Ö–A</SelectItem>
            <SelectItem value="stage">Stadie</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative min-w-10 flex-1 shrink md:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök på namn eller e-post…"
            aria-label="Sök kandidat"
            className="h-9 w-full rounded-xl border border-border bg-surface-low pl-9 pr-3 text-[13px] outline-none placeholder:text-faint focus:border-primary/60"
          />
        </div>
        {canManage && (
          <Button
            variant="gradient"
            className="md:ml-auto"
            onClick={() => setDialog({ open: true, candidate: null })}
          >
            <Plus className="icon-rotate" /> Lägg till kandidat
          </Button>
        )}
      </div>

      <div className="glass-card mt-4 overflow-hidden rounded-2xl">
        {visible.map((c) => {
          const stage = STAGES.find((s) => s.id === c.stage);
          return (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "flex cursor-pointer flex-wrap items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-high/60 sm:flex-nowrap",
                selectedId === c.id && "bg-surface-high/80",
              )}
            >
              <Avatar name={c.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[13px] font-semibold">{c.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{c.email || c.phone || "–"}</div>
              </div>
              <div className="flex min-w-0 items-center gap-2 sm:w-64">
                {c.jobId ? (
                  <>
                    <span className="truncate text-[12px] text-muted-foreground">{jobTitle(c.jobId)}</span>
                    {stage && (
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", stageStyles[c.stage].pill)}>
                        {stage.label}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-full border border-border bg-surface-high px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Vilande
                  </span>
                )}
              </div>
              <span className="hidden font-mono text-[10px] text-faint md:block">{c.createdAt}</span>
              {canMove && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="border-primary/30 text-primary" onClick={(e) => e.stopPropagation()}>
                      <Send /> Skicka till jobb
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuLabel className="text-[11px]">Skicka till</DropdownMenuLabel>
                    {orgJobs.filter((j) => j.status === "open" && j.id !== c.jobId).map((j) => (
                      <DropdownMenuItem key={j.id} onSelect={() => send(c, j.id)}>{j.title}</DropdownMenuItem>
                    ))}
                    {c.jobId && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => send(c, null)}>Gör vilande</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
        {visible.length === 0 && <p className="p-8 text-center text-muted-foreground">Inga kandidater hittades.</p>}
      </div>

      <CandidateDialog
        open={dialog.open && !addInline}
        candidate={dialog.candidate}
        defaultJobId={jobFilter === ALL ? POOL : jobFilter}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </WithCandidatePanel>
  );
}
