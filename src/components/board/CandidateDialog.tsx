import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, Video, Check, Link2, Plus, UserPlus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FieldError, inputClass, labelClass, normalizeUrl } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/ats-store";
import { STAGES, type Candidate, type CandidateLink, type Stage } from "@/lib/mock-data";
import { POOL } from "./CandidatePanel";
import { UnsavedCandidateDialog } from "./UnsavedCandidateDialog";
import { hasCandidateDraftChanges } from "@/lib/candidate-draft";

const linkedinRe = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/i;

export const candidateSchema = z.object({
  name: z.string().trim().min(2, "Ange namn (minst 2 tecken)").max(100, "Max 100 tecken"),
  email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => !v || z.string().email().safeParse(v).success, "Ogiltig e-postadress"),
  phone: z
    .string()
    .trim()
    .max(30, "Max 30 tecken")
    .refine((v) => !v || /^[+0-9\s\-()]{6,}$/.test(v), "Ogiltigt telefonnummer"),
  linkedin: z
    .string()
    .trim()
    .refine(
      (v) => !v || linkedinRe.test(v),
      "Ange en giltig LinkedIn-URL, t.ex. https://www.linkedin.com/in/namn",
    ),
  interviewAt: z.string(),
  interviewLink: z
    .string()
    .transform(normalizeUrl)
    .refine(
      (v) => !v || /^https?:\/\/[^\s.]+\.[^\s]+$/.test(v),
      "Ange en giltig adress som börjar med https://",
    ),
  note: z.string().max(2000, "Max 2000 tecken"),
  jobId: z.string(),
  stage: z.enum(["new", "screening", "interview", "offer", "hired", "rejected"]),
});
type Values = z.infer<typeof candidateSchema>;

export function CandidateDialog({
  open,
  onOpenChange,
  candidate,
  defaultJobId,
  inline,
}: {
  inline?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  candidate?: Candidate | null;
  defaultJobId?: string;
}) {
  const { jobs, activeOrgId, createCandidate, updateCandidate, orgJobs } = useAts();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(candidateSchema),
  });

  const [confirmClose, setConfirmClose] = useState(false);
  const [links, setLinks] = useState<CandidateLink[]>([]);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string>();

  const addPendingLink = () => {
    const url = normalizeUrl(linkUrl);
    const label = linkLabel.trim() || "Länk";
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(url))
      return setLinkError("Ange en giltig adress som börjar med https://");
    if (label.length > 40) return setLinkError("Namnet får vara max 40 tecken");
    setLinks((l) => [...l, { id: `l-${Date.now()}-${l.length}`, label, url }]);
    setLinkLabel("");
    setLinkUrl("");
    setLinkError(undefined);
  };

  useEffect(() => {
    if (!open) return;
    setConfirmClose(false);
    setLinks(candidate?.links ?? []);
    setLinkLabel("");
    setLinkUrl("");
    setLinkError(undefined);
    reset(
      candidate
        ? {
            name: candidate.name,
            email: candidate.email,
            phone: candidate.phone,
            linkedin: candidate.linkedin,
            note: candidate.note,
            interviewAt: candidate.interviewAt ?? "",
            interviewLink: candidate.interviewLink ?? "",
            jobId: candidate.jobId ?? POOL,
            stage: candidate.stage,
          }
        : {
            name: "",
            email: "",
            phone: "",
            linkedin: "",
            note: "",
            interviewAt: "",
            interviewLink: "",
            jobId: defaultJobId || orgJobs[0]?.id || POOL,
            stage: "new" as Stage,
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate]);

  const requestClose = () => {
    const linksChanged = hasCandidateDraftChanges({ links }, { links: candidate?.links ?? [] });
    if (isDirty || linksChanged || linkLabel.trim() || linkUrl.trim()) setConfirmClose(true);
    else onOpenChange(false);
  };

  const onSubmit = (v: Values) => {
    let savedLinks = links;
    if (linkLabel.trim() || linkUrl.trim()) {
      const url = normalizeUrl(linkUrl);
      if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(url)) {
        setLinkError("Ange en giltig adress som börjar med https://");
        setConfirmClose(false);
        return;
      }
      savedLinks = [...links, { id: `l-${Date.now()}`, label: linkLabel.trim() || "Länk", url }];
    }
    const input = {
      ...v,
      linkedin: v.linkedin ? normalizeUrl(v.linkedin) : v.linkedin,
      links: savedLinks,
      jobId: v.jobId === POOL ? null : v.jobId,
      stage: v.jobId === POOL ? ("new" as Stage) : v.stage,
    };
    if (candidate) updateCandidate(candidate.id, input);
    else createCandidate(input);
    setConfirmClose(false);
    onOpenChange(false);
  };

  const interviewFields = candidate ? (
    <div className="space-y-2">
      <span className={labelClass}>Intervju</span>
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 shrink-0 text-faint" />
        <input
          type="datetime-local"
          aria-label="Datum och tid för intervju"
          className={cn(inputClass, "min-w-0")}
          {...register("interviewAt")}
        />
      </div>
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 shrink-0 text-faint" />
        <input
          aria-label="Länk till intervju"
          placeholder="https://meet.google.com/…"
          maxLength={500}
          className={cn(inputClass, "min-w-0")}
          {...register("interviewLink")}
        />
      </div>
      <FieldError message={errors.interviewLink?.message} />
    </div>
  ) : null;

  return (
    <>
      <UnsavedCandidateDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        onSave={() => {
          void handleSubmit(onSubmit, () => setConfirmClose(false))();
        }}
        onDiscard={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />
      {inline ? (
        open ? (
          <div className="p-5">
            <div className="flex items-center gap-2 label-caps text-accent-3">
              <UserPlus className="h-3.5 w-3.5" /> Kandidat
            </div>
            <h2 className="mb-4 font-display text-xl font-bold">
              {candidate ? "Redigera kandidat" : "Ny kandidat"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className={labelClass} htmlFor="c-name">
                  Namn <span className="text-error">*</span>
                </label>
                <input
                  id="c-name"
                  className={inputClass}
                  placeholder="För- och efternamn"
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="c-email">
                    E-post
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className={inputClass}
                    placeholder="namn@exempel.se"
                    {...register("email")}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="c-phone">
                    Telefon
                  </label>
                  <input
                    id="c-phone"
                    className={inputClass}
                    placeholder="070-123 45 67"
                    {...register("phone")}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="c-li">
                  LinkedIn-URL
                </label>
                <input
                  id="c-li"
                  className={inputClass}
                  placeholder="https://www.linkedin.com/in/namn"
                  {...register("linkedin")}
                />
                <FieldError message={errors.linkedin?.message} />
              </div>
              <div>
                <span className={labelClass}>Övriga länkar</span>
                {links.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {links.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2 text-[13px]"
                      >
                        <Link2 className="h-4 w-4 shrink-0 text-faint" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{l.label}</span>{" "}
                          <span className="text-[11px] text-muted-foreground">
                            {l.url.replace(/^https?:\/\//, "")}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLinks((x) => x.filter((y) => y.id !== l.id))}
                          aria-label={`Ta bort ${l.label}`}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-error-bg hover:text-error"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <input
                    className={inputClass}
                    placeholder="GitHub, Portfolio…"
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPendingLink();
                      }
                    }}
                    aria-label="Länkens adress"
                  />
                  <Button type="button" variant="outline" className="h-10" onClick={addPendingLink}>
                    <Plus /> Lägg till
                  </Button>
                </div>
                <FieldError message={linkError} />
              </div>
              <div className={cn("grid gap-4", candidate && "sm:grid-cols-2")}>
                <div>
                  <span className={labelClass}>Tjänster</span>
                  <Controller
                    control={control}
                    name="jobId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low">
                          <SelectValue placeholder="Välj tjänst" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={POOL}>Vilande (ingen tjänst)</SelectItem>
                          {orgJobs.map((j) => (
                            <SelectItem key={j.id} value={j.id}>
                              {j.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.jobId?.message} />
                </div>
                {candidate && (
                  <div>
                    <span className={labelClass}>Stadie</span>
                    <Controller
                      control={control}
                      name="stage"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
              {interviewFields}
              <div>
                <label className={labelClass} htmlFor="c-note">
                  Anteckning
                </label>
                <textarea
                  id="c-note"
                  rows={3}
                  className={cn(inputClass, "h-auto py-2.5")}
                  {...register("note")}
                />
                <FieldError message={errors.note?.message} />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={requestClose}>
                  Avbryt
                </Button>
                <Button type="submit" variant="gradient">
                  <Check /> {candidate ? "Spara" : "Lägg till"}
                </Button>
              </div>
            </form>
          </div>
        ) : null
      ) : (
        <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
          <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-surface sm:max-w-xl">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2 label-caps text-accent-3">
                <UserPlus className="h-3.5 w-3.5" /> Kandidat
              </div>
              <DialogTitle className="font-display text-xl font-bold">
                {candidate ? "Redigera kandidat" : "Ny kandidat"}
              </DialogTitle>
              <DialogDescription className="text-[12px]">
                Fält markerade med * är obligatoriska.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className={labelClass} htmlFor="c-name">
                  Namn <span className="text-error">*</span>
                </label>
                <input
                  id="c-name"
                  className={inputClass}
                  placeholder="För- och efternamn"
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="c-email">
                    E-post
                  </label>
                  <input
                    id="c-email"
                    type="email"
                    className={inputClass}
                    placeholder="namn@exempel.se"
                    {...register("email")}
                  />
                  <FieldError message={errors.email?.message} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="c-phone">
                    Telefon
                  </label>
                  <input
                    id="c-phone"
                    className={inputClass}
                    placeholder="070-123 45 67"
                    {...register("phone")}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="c-li">
                  LinkedIn-URL
                </label>
                <input
                  id="c-li"
                  className={inputClass}
                  placeholder="https://www.linkedin.com/in/namn"
                  {...register("linkedin")}
                />
                <FieldError message={errors.linkedin?.message} />
              </div>
              <div>
                <span className={labelClass}>Övriga länkar</span>
                {links.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {links.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2 text-[13px]"
                      >
                        <Link2 className="h-4 w-4 shrink-0 text-faint" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{l.label}</span>{" "}
                          <span className="text-[11px] text-muted-foreground">
                            {l.url.replace(/^https?:\/\//, "")}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setLinks((x) => x.filter((y) => y.id !== l.id))}
                          aria-label={`Ta bort ${l.label}`}
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint transition hover:bg-error-bg hover:text-error"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                  <input
                    className={inputClass}
                    placeholder="GitHub, Portfolio…"
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPendingLink();
                      }
                    }}
                    aria-label="Länkens adress"
                  />
                  <Button type="button" variant="outline" className="h-10" onClick={addPendingLink}>
                    <Plus /> Lägg till
                  </Button>
                </div>
                <FieldError message={linkError} />
              </div>
              <div className={cn("grid gap-4", candidate && "sm:grid-cols-2")}>
                <div>
                  <span className={labelClass}>Tjänst</span>
                  <Controller
                    control={control}
                    name="jobId"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low">
                          <SelectValue placeholder="Välj tjänst" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={POOL}>Vilande (ingen tjänst)</SelectItem>
                          {orgJobs.map((j) => (
                            <SelectItem key={j.id} value={j.id}>
                              {j.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.jobId?.message} />
                </div>
                {candidate && (
                  <div>
                    <span className={labelClass}>Stadie</span>
                    <Controller
                      control={control}
                      name="stage"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
              {interviewFields}
              <div>
                <label className={labelClass} htmlFor="c-note">
                  Anteckning
                </label>
                <textarea
                  id="c-note"
                  rows={3}
                  className={cn(inputClass, "h-auto py-2.5")}
                  {...register("note")}
                />
                <FieldError message={errors.note?.message} />
              </div>
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={requestClose}>
                  Avbryt
                </Button>
                <Button type="submit" variant="gradient">
                  <Check /> {candidate ? "Spara" : "Lägg till"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
