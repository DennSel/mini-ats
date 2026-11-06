import { useEffect, useState, type ReactNode } from "react";
import { CalendarClock, Video, ExternalLink, Link2, Linkedin, Mail, Pencil, Phone, Plus, Trash2, Check, X } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, FieldError, inputClass, labelClass, normalizeUrl, stageStyles } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/ats-store";
import { STAGES, type Stage } from "@/lib/mock-data";

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
  const { candidates, jobs, activeOrgId, updateCandidate, deleteCandidate, moveCandidate, assignCandidate, addLink, removeLink, can, orgJobs } = useAts();
  const c = candidates.find((x) => x.id === candidateId) ?? null;
  const job = jobs.find((j) => j.id === c?.jobId);
    const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string>();
  const [addingLink, setAddingLink] = useState(false);
  const canMove = can("moveCandidates");
  const canManage = can("manageCandidates");

  const [ivAt, setIvAt] = useState("");
  const [ivLink, setIvLink] = useState("");
  const [ivError, setIvError] = useState<string>();
  useEffect(() => setNote(c?.note ?? ""), [c?.id, c?.note]);
  useEffect(() => {
    setIvAt(c?.interviewAt ?? "");
    setIvLink(c?.interviewLink ?? "");
    setIvError(undefined);
  }, [c?.id, c?.interviewAt, c?.interviewLink]);
  useEffect(() => {
    setAddingLink(false);
    setLinkLabel("");
    setLinkUrl("");
    setLinkError(undefined);
  }, [c?.id]);

  if (!c) return null;
  const Title = inline ? "h2" : SheetTitle;
  const Desc = inline ? "p" : SheetDescription;

  const submitLink = () => {
    const url = normalizeUrl(linkUrl);
    const label = linkLabel.trim() || "Länk";
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(url)) {
      setLinkError("Ange en giltig adress som börjar med https://");
      return;
    }
    if (label.length > 40) {
      setLinkError("Namnet får vara max 40 tecken");
      return;
    }
    addLink(c.id, label, url);
    setLinkLabel("");
    setLinkUrl("");
    setLinkError(undefined);
    setAddingLink(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 pr-8">
        <Avatar name={c.name} size="lg" />
        <div className="min-w-0">
          <Title className="truncate font-display text-lg font-bold">{c.name}</Title>
          <Desc className="truncate text-[12px] text-muted-foreground">{job?.title ?? "Vilande"}</Desc>
        </div>
      </div>

      <div className={cn("grid gap-3", c.jobId && "grid-cols-2")}>
        <div>
          <span className={labelClass}>Jobb</span>
          <Select
            value={c.jobId ?? POOL}
            disabled={!canManage}
            onValueChange={(v) => {
              assignCandidate(c.id, v === POOL ? null : v);
              toast.success(v === POOL ? "Kandidaten är nu vilande" : "Kandidaten skickades till jobbet");
            }}
          >
            <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={POOL}>Vilande</SelectItem>
              {orgJobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}{j.status === "closed" ? " (stängt)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {c.jobId && (
          <div>
            <span className={labelClass}>Stadie</span>
            <Select value={c.stage} disabled={!canMove} onValueChange={(v) => moveCandidate(c.id, v as Stage)}>
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", stageStyles[s.id].dot)} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-surface-low p-4 text-[13px]">
        <Row icon={Mail} label="E-post">
          {c.email ? <a href={`mailto:${c.email}`} className="hover:text-primary">{c.email}</a> : "–"}
        </Row>
        <Row icon={Phone} label="Telefon">{c.phone || "–"}</Row>
        <Row icon={Linkedin} label="LinkedIn">
          {c.linkedin ? (
            <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Öppna profil</a>
          ) : "–"}
        </Row>
      </div>

      <div>
        <span className={labelClass}>Länkar</span>
        <div className="space-y-1.5">
          {c.links.map((l) => (
            <div key={l.id} className="group flex items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2 text-[13px]">
              <Link2 className="h-4 w-4 shrink-0 text-faint" />
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:text-primary">
                <span className="font-semibold">{l.label}</span>{" "}
                <span className="text-[11px] text-muted-foreground">{l.url.replace(/^https?:\/\//, "")}</span>
              </a>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-faint" />
              {canManage && (
                <button
                  onClick={() => removeLink(c.id, l.id)}
                  aria-label={`Ta bort ${l.label}`}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-error-bg hover:text-error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {c.links.length === 0 && !addingLink && <p className="text-[12px] text-faint">Inga länkar ännu.</p>}
        </div>
        {canManage && (addingLink ? (
          <div className="mt-2 space-y-2 rounded-xl border border-border p-3">
            <input
              className={inputClass}
              placeholder="Namn, t.ex. GitHub eller Portfolio"
              value={linkLabel}
              maxLength={40}
              onChange={(e) => setLinkLabel(e.target.value)}
              aria-label="Länkens namn"
            />
            <input
              className={inputClass}
              placeholder="https://"
              value={linkUrl}
              maxLength={500}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitLink()}
              aria-label="Länkens adress"
            />
            <FieldError message={linkError} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAddingLink(false)}>Avbryt</Button>
              <Button size="sm" variant="outline" onClick={submitLink}><Check /> Lägg till</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAddingLink(true)}>
            <Plus /> Lägg till länk
          </Button>
        ))}
      </div>

      <div>
        <span className={labelClass}>Intervju</span>
        <div className="space-y-2 rounded-2xl border border-border bg-surface-low p-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 shrink-0 text-faint" />
            <input
              type="datetime-local"
              value={ivAt}
              disabled={!canMove}
              onChange={(e) => setIvAt(e.target.value)}
              aria-label="Datum och tid för intervju"
              className={cn(inputClass, "min-w-0")}
            />
                        {canMove && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 shrink-0"
                  disabled={ivAt === (c.interviewAt ?? "") && ivLink === (c.interviewLink ?? "")}
                  onClick={() => {
                    const link = normalizeUrl(ivLink);
                    if (link && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(link)) {
                      setIvError("Ange en giltig adress som börjar med https://");
                      return;
                    }
                    setIvError(undefined);
                    updateCandidate(c.id, { interviewAt: ivAt, interviewLink: link });
                    toast.success("Intervjun sparades");
                  }}
                >
                  <Check /> Spara
                </Button>
              )}
              {canMove && (c.interviewAt || c.interviewLink) && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Ta bort intervju"
                  className="h-10 w-10 shrink-0 text-faint hover:bg-error-bg hover:text-error"
                  onClick={() => {
                    updateCandidate(c.id, { interviewAt: "", interviewLink: "" });
                    toast.success("Intervjun togs bort");
                  }}
                >
                  <X />
                </Button>
              )}
            </div>
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 shrink-0 text-faint" />
            <input
              value={ivLink}
              disabled={!canMove}
              maxLength={500}
              onChange={(e) => setIvLink(e.target.value)}
              placeholder="Möteslänk, t.ex. https://meet.google.com/…"
              aria-label="Länk till intervju"
              className={cn(inputClass, "min-w-0")}
            />
            {c.interviewLink && (
              <a
                href={c.interviewLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Öppna möteslänk"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-primary transition hover:bg-surface-high"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <FieldError message={ivError} />
        </div>
      </div>

      <div>
        <label htmlFor="sheet-note" className={labelClass}>Anteckning</label>
        <textarea
          id="sheet-note"
          rows={5}
          value={note}
          maxLength={2000}
          disabled={!canMove}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Skriv en anteckning…"
          className={cn(inputClass, "h-auto py-2.5")}
        />
        {canMove && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={note === c.note}
              onClick={() => {
                updateCandidate(c.id, { note });
                toast.success("Anteckningen sparades");
              }}
            >
              <Check /> Spara anteckning
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="flex gap-2 border-t border-border pt-4">
          <Button variant="gradient" className="flex-1" onClick={onEdit}><Pencil /> Redigera</Button>
          <Button variant="outline" className="border-error/30 text-error hover:bg-error-bg" onClick={() => setConfirm(true)}>
            <Trash2 /> Radera
          </Button>
        </div>
      )}

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-2xl border-border bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Radera kandidat?</AlertDialogTitle>
            <AlertDialogDescription>{c.name} tas bort permanent. Detta går inte att ångra.</AlertDialogDescription>
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

function Row({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-faint" />
      <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}
