import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarClock,
  Video,
  ExternalLink,
  FileText,
  Link2,
  Linkedin,
  Mail,
  Pencil,
  Phone,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/features";
import { supabase } from "@/lib/supabase";
import { Avatar, interviewUrgencyStyles, labelClass, stageStyles } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/ats-store";
import { STAGES } from "@/lib/mock-data";
import { interviewRelativeDays, interviewUrgency } from "@/lib/ats-logic";

export const POOL = "__pool";

export function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

/**
 * Page content with the candidate details beside it on desktop (pushes the page left),
 * and as a slide-in sheet on smaller screens.
 */
export function WithCandidatePanel({
  candidateId,
  onClose,
  onEdit,
  children,
  side,
  onSideClose,
}: {
  side?: ReactNode;
  onSideClose?: () => void;
  candidateId: string | null;
  onClose: () => void;
  onEdit: () => void;
  children: ReactNode;
}) {
  const desktop = useIsDesktop();
  const { candidates } = useAts();
  const exists = candidates.some((c) => c.id === candidateId);
  const open = !!candidateId && exists;

  return (
    <div className="flex items-start gap-5">
      <div className="min-w-0 flex-1">{children}</div>
      {desktop && side && (
        <aside className="glass-card sticky top-20 max-h-[calc(100vh-6rem)] w-[400px] shrink-0 overflow-y-auto rounded-2xl animate-in fade-in slide-in-from-right-4">
          <button
            onClick={onSideClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-high hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          {side}
        </aside>
      )}
      {desktop && !side && open && (
        <aside className="glass-card sticky top-20 max-h-[calc(100vh-6rem)] w-[400px] shrink-0 overflow-y-auto rounded-2xl animate-in fade-in slide-in-from-right-4">
          <button
            onClick={onClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-faint transition hover:bg-surface-high hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <CandidateDetails candidateId={candidateId} onClose={onClose} onEdit={onEdit} inline />
        </aside>
      )}
      {!desktop && (
        <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
          <SheetContent className="w-full overflow-y-auto border-border bg-surface-lowest p-0 sm:max-w-md">
            <CandidateDetails candidateId={candidateId} onClose={onClose} onEdit={onEdit} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function CandidateDetails({
  candidateId,
  onClose,
  onEdit,
  inline,
}: {
  candidateId: string | null;
  onClose: () => void;
  onEdit: () => void;
  inline?: boolean;
}) {
  const { candidates, users, jobs, deleteCandidate, can } = useAts();
  const c = candidates.find((x) => x.id === candidateId) ?? null;
  const job = jobs.find((j) => j.id === c?.jobId);
  const [confirm, setConfirm] = useState(false);
  const canManage = can("manageCandidates");

  if (!c) return null;
  const Title = inline ? "h2" : SheetTitle;
  const Desc = inline ? "p" : SheetDescription;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 pr-8">
        <Avatar name={c.name} size="lg" />
        <div className="min-w-0">
          <Title className="truncate font-display text-lg font-bold">{c.name}</Title>
          <Desc className="truncate text-[12px] text-muted-foreground">
            {job?.title ?? "Vilande"}
          </Desc>
          <p className="mt-0.5 truncate text-[11px] text-faint">
            Tillagd {c.createdAt}
            {(() => {
              const by = users.find((u) => u.id === c.createdBy);
              return by ? ` av ${by.name}` : "";
            })()}
          </p>
        </div>
      </div>

      <div className={cn("grid gap-3", c.jobId && "grid-cols-2")}>
        <div>
          <span className={labelClass}>Tjänst</span>
          <div className="flex h-10 items-center rounded-xl border border-border bg-surface-low px-3 text-[13px] font-medium text-foreground">
            <span className="truncate">{job ? job.title : "Vilande"}</span>
          </div>
        </div>
        {c.jobId && (
          <div>
            <span className={labelClass}>Stadie</span>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface-low px-3 text-[13px] font-medium text-foreground">
              <span className={cn("h-2 w-2 rounded-full", stageStyles[c.stage].dot)} />
              <span>{STAGES.find((s) => s.id === c.stage)?.label ?? c.stage}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface-low p-4 text-[13px]">
        <Row icon={Mail} label="E-post">
          {c.email ? (
            <a href={`mailto:${c.email}`} className="hover:text-primary">
              {c.email}
            </a>
          ) : (
            "–"
          )}
        </Row>
        <Row icon={Phone} label="Telefon">
          {c.phone || "–"}
        </Row>
        <Row icon={Linkedin} label="LinkedIn">
          {c.linkedin ? (
            <a
              href={c.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Öppna profil
            </a>
          ) : (
            "–"
          )}
        </Row>
      </div>

      <div>
        <span className={labelClass}>Länkar</span>
        <div className="space-y-1.5">
          {c.links.map((l) => (
            <div
              key={l.id}
              className="group flex items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2 text-[13px]"
            >
              <Link2 className="h-4 w-4 shrink-0 text-faint" />
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate hover:text-primary"
              >
                <span className="font-semibold">{l.label}</span>{" "}
                <span className="text-[11px] text-muted-foreground">
                  {l.url.replace(/^https?:\/\//, "")}
                </span>
              </a>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
            </div>
          ))}
          {c.links.length === 0 && <p className="text-[12px] text-faint">Inga länkar ännu.</p>}
        </div>
      </div>

      <div>
        <span className={labelClass}>Intervju</span>
        {c.interviewAt || c.interviewLink ? (
          <div className="space-y-2 rounded-2xl border border-border bg-surface-low p-3 text-[13px]">
            {c.interviewAt &&
              (() => {
                const rel = interviewRelativeDays(c.interviewAt);
                const urgency = interviewUrgency(c.interviewAt);
                return (
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0 text-faint" />
                    <span className={cn(urgency === "past" && interviewUrgencyStyles.past)}>
                      {c.interviewAt.slice(0, 16).replace("T", " kl. ")}
                      {rel && (
                        <span className={cn("ml-1.5 font-medium", interviewUrgencyStyles[urgency])}>
                          ({rel})
                        </span>
                      )}
                    </span>
                  </div>
                );
              })()}
            {c.interviewLink && (
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 shrink-0 text-faint" />
                <a
                  href={c.interviewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-primary hover:underline"
                >
                  {c.interviewLink}
                </a>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
              </div>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-faint">Ingen intervju inbokad.</p>
        )}
      </div>

      <div>
        <span className={labelClass}>Anteckning</span>
        {c.note ? (
          <div className="rounded-2xl border border-border bg-surface-low p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap">
            {c.note}
          </div>
        ) : (
          <p className="text-[12px] text-faint">Ingen anteckning.</p>
        )}
      </div>

      {FEATURES.resumeUpload && c.resumePath && (
        <div className="border-t border-border pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              const win = window.open("", "_blank");
              const { data, error } = await supabase.storage
                .from("resumes")
                .download(c.resumePath!);
              if (error || !data) {
                win?.close();
                toast.error("Kunde inte öppna CV:t");
                return;
              }
              const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
              if (win) {
                win.location.href = blobUrl;
              } else {
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = `${c.name}-cv.pdf`;
                a.click();
              }
              setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
            }}
          >
            <FileText /> Visa CV (PDF)
          </Button>
        </div>
      )}

      {canManage && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button variant="gradient" className="flex-1" onClick={onEdit}>
            <Pencil /> Redigera
          </Button>
          <Button
            variant="outline"
            className="border-error/30 text-error hover:bg-error-bg"
            onClick={() => setConfirm(true)}
          >
            <Trash2 /> Radera
          </Button>
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-2xl border-border bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Radera kandidat?</AlertDialogTitle>
            <AlertDialogDescription>
              {c.name} tas bort permanent. Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-on-primary hover:bg-destructive/90"
              onClick={() => {
                deleteCandidate(c.id);
                setConfirm(false);
                onClose();
                toast.success("Kandidaten raderades");
              }}
            >
              Radera
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-faint" />
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}
