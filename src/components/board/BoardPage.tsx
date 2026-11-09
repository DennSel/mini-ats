import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/components/shared";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { BrushCleaning, Plus } from "lucide-react";
import { useAts } from "@/lib/ats-store";
import { filterCandidates } from "@/lib/ats-logic";
import { STAGES, type Candidate, type Stage } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoActiveOrgState, SearchInput, ViewLabel, stageStyles } from "@/components/shared";
import { cn } from "@/lib/utils";
import { CandidateCardView, SortableCandidateCard } from "./CandidateCard";
import { WithCandidatePanel, useIsDesktop } from "./CandidatePanel";
import { CandidateDialog } from "./CandidateDialog";

const ALL = "__all";

export function BoardPage({ job, q }: { job: string; q: string }) {
  const { candidates, jobs, activeOrgId, moveCandidate, can, orgJobs, orgCandidates } = useAts();
  const canMove = can("moveCandidates");
  const canManage = can("manageCandidates");
  const navigate = useNavigate({ from: "/board" });
  const [qInput, setQInput] = useState(q);
  const [selectedId, setSelectedId] = usePersistentState<string | null>("board.selected", null);
  const desktop = useIsDesktop();
  const [dialog, setDialog] = usePersistentState<{ open: boolean; candidate: Candidate | null }>(
    "board.dialog",
    {
      open: false,
      candidate: null,
    },
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const jobValid = orgJobs.some((j) => j.id === job);
  const jobFilter = jobValid ? job : "";

  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    if (qInput === q) return;
    const t = setTimeout(
      () => navigate({ search: (p) => ({ ...p, q: qInput }), replace: true }),
      300,
    );
    return () => clearTimeout(t);
  }, [qInput, q, navigate]);

  const visible = useMemo(
    () =>
      filterCandidates(orgCandidates, {
        orgId: activeOrgId,
        jobId: jobFilter,
        q,
        assignedOnly: true,
      }),
    [orgCandidates, activeOrgId, jobFilter, q],
  );
  const jobTitle = (id: string | null) => jobs.find((j) => j.id === id)?.title ?? "";

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const noSensors = useSensors();
  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const overId = String(over.id);
    if (overId.startsWith("col:")) {
      moveCandidate(String(active.id), overId.slice(4) as Stage, null);
      return;
    }
    const overCand = visible.find((c) => c.id === overId);
    const activeCand = visible.find((c) => c.id === active.id);
    if (!overCand || !activeCand) return;
    const col = visible.filter((c) => c.stage === overCand.stage);
    let beforeId: string | null = overCand.id;
    if (activeCand.stage === overCand.stage) {
      const ai = col.findIndex((c) => c.id === activeCand.id);
      const oi = col.findIndex((c) => c.id === overCand.id);
      if (ai < oi) beforeId = col[oi + 1]?.id ?? null;
    }
    moveCandidate(activeCand.id, overCand.stage, beforeId);
  };

  const hasFilter = !!jobFilter || !!q;
  const active = activeId ? visible.find((c) => c.id === activeId) : null;

  const addInline = desktop && dialog.open && !dialog.candidate;
  const closeDialog = (open: boolean) => setDialog((d) => ({ ...d, open }));

  if (!activeOrgId) {
    return <NoActiveOrgState />;
  }

  return (
    <WithCandidatePanel
      side={
        addInline ? (
          <CandidateDialog
            inline
            open
            candidate={null}
            defaultJobId={jobFilter}
            onOpenChange={closeDialog}
          />
        ) : undefined
      }
      onSideClose={() => closeDialog(false)}
      candidateId={selectedId}
      onClose={() => setSelectedId(null)}
      onEdit={() => {
        const c = candidates.find((x) => x.id === selectedId);
        if (c) setDialog({ open: true, candidate: c });
      }}
    >
      <div className="flex h-full flex-col">
        <div className="glass flex flex-col gap-2 rounded-2xl p-2 pl-4 md:flex-row md:items-center">
          <ViewLabel className="md:pr-1">Kandidatflöde</ViewLabel>
          <Select
            value={jobFilter || ALL}
            onValueChange={(v) => navigate({ search: (p) => ({ ...p, job: v === ALL ? "" : v }) })}
          >
            <SelectTrigger
              className="h-9 rounded-xl border-border bg-surface-low md:w-60"
              aria-label="Filtrera på tjänst"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alla tjänster</SelectItem>
              {orgJobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SearchInput
            value={qInput}
            onChange={setQInput}
            placeholder="Sök kandidat på namn…"
            aria-label="Sök kandidat"
          />
          <div className="flex gap-2 md:ml-auto">
            <Button
              variant="outline"
              className="shrink-0 border-border text-muted-foreground hover:text-foreground"
              aria-label="Rensa filter"
              disabled={!hasFilter && !qInput}
              onClick={() => {
                setQInput("");
                navigate({ search: { job: "", q: "" } });
              }}
            >
              <BrushCleaning /> Rensa
            </Button>
            {canManage && (
              <Button
                variant="gradient"
                className="md:flex-none"
                onClick={() => setDialog({ open: true, candidate: null })}
              >
                <Plus className="icon-rotate" /> Ny kandidat
              </Button>
            )}
          </div>
        </div>

        <DndContext
          sensors={canMove ? sensors : noSensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div
            className={cn(
              "-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 lg:-mx-0 lg:px-0",
              !selectedId &&
                !addInline &&
                "xl:grid xl:grid-cols-6 xl:overflow-visible xl:snap-none",
            )}
          >
            {STAGES.map((s) => (
              <Column
                key={s.id}
                stage={s.id}
                label={s.label}
                items={visible.filter((c) => c.stage === s.id)}
                jobTitle={jobTitle}
                selectedId={selectedId}
                onOpen={setSelectedId}
                compact={!!selectedId || addInline}
                onMove={canMove ? (id, st) => moveCandidate(id, st) : undefined}
              />
            ))}
          </div>
          <DragOverlay>
            {active && (
              <CandidateCardView candidate={active} jobTitle={jobTitle(active.jobId)} dragging />
            )}
          </DragOverlay>
        </DndContext>

        <CandidateDialog
          open={dialog.open && !addInline}
          candidate={dialog.candidate}
          defaultJobId={jobFilter}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        />
      </div>
    </WithCandidatePanel>
  );
}

function Column({
  stage,
  label,
  items,
  jobTitle,
  selectedId,
  onOpen,
  onMove,
  compact,
}: {
  stage: Stage;
  label: string;
  items: Candidate[];
  jobTitle: (id: string | null) => string;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onMove: ((id: string, s: Stage) => void) | undefined;
  compact: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage}` });
  const st = stageStyles[stage];
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] w-[85%] shrink-0 snap-center flex-col rounded-2xl border p-3 transition sm:w-72",
        compact ? "lg:w-60" : "xl:w-auto xl:min-w-0",
        isOver ? "border-primary/40 bg-surface-high/70" : "border-border bg-surface-low/80",
      )}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", st.dot)} />
          <h2 className={cn("label-caps text-[11px]", st.text)}>{label}</h2>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[10px]", st.pill)}>
          {items.length}
        </span>
      </header>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {items.map((c) => (
            <SortableCandidateCard
              key={c.id}
              candidate={c}
              jobTitle={jobTitle(c.jobId)}
              selected={selectedId === c.id}
              onOpen={() => onOpen(c.id)}
              {...(onMove ? { onMove: (s: Stage) => onMove(c.id, s) } : {})}
            />
          ))}
          {items.length === 0 && (
            <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border text-[11px] text-faint">
              Inga kandidater
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
