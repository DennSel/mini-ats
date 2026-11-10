import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRightLeft, CalendarClock, Linkedin } from "lucide-react";
import { Avatar, interviewUrgencyStyles, stageStyles } from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { interviewUrgency } from "@/lib/ats-logic";
import { STAGES, type Candidate, type Stage } from "@/lib/mock-data";

export function CandidateCardView({
  candidate,
  jobTitle,
  selected,
  onOpen,
  onMove,
  dragging,
}: {
  candidate: Candidate;
  jobTitle: string;
  selected?: boolean;
  onOpen?: () => void;
  onMove?: (s: Stage) => void;
  dragging?: boolean;
}) {
  const st = stageStyles[candidate.stage];
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative cursor-pointer rounded-xl border border-border bg-surface p-3 transition-colors duration-150 hover:bg-surface-high",
        st.hoverBorder,
        selected && "border-2 border-primary glow dark:glow-strong ring-0",
        dragging && "rotate-1 glow-strong",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-semibold">{candidate.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{jobTitle}</div>
        </div>
        {onMove && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Flytta till"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-faint transition hover:bg-surface-high hover:text-foreground lg:absolute lg:right-2 lg:top-2 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel className="text-[11px]">Flytta till</DropdownMenuLabel>
              {STAGES.filter((s) => s.id !== candidate.stage).map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => onMove(s.id)}>
                  <span className={cn("h-2 w-2 rounded-full", stageStyles[s.id].dot)} /> {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        {candidate.interviewAt ? (
          <span
            className={cn(
              "flex items-center gap-1 font-mono text-[10px]",
              interviewUrgencyStyles[interviewUrgency(candidate.interviewAt)],
            )}
          >
            <CalendarClock className="h-3 w-3" />{" "}
            {candidate.interviewAt.slice(0, 16).replace("T", " ")}
          </span>
        ) : (
          <span className="text-[10px] text-faint">Ingen intervju bokad</span>
        )}
        {candidate.linkedin && (
          <a
            href={candidate.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="LinkedIn-profil"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:text-primary lg:-mr-1"
          >
            <Linkedin className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export function SortableCandidateCard(props: Parameters<typeof CandidateCardView>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.candidate.id,
    data: { stage: props.candidate.stage },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <CandidateCardView {...props} />
    </div>
  );
}
