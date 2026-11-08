import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, FilePlus2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FieldError, inputClass, labelClass } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useAts } from "@/lib/ats-store";
import type { Job } from "@/lib/mock-data";

const schema = z.object({
  title: z.string().trim().min(2, "Titeln måste vara minst 2 tecken").max(100, "Max 100 tecken"),
  location: z.string().trim().min(2, "Ange en plats").max(80, "Max 80 tecken"),
  description: z.string().trim().max(1000, "Max 1000 tecken"),
  status: z.enum(["open", "closed"]),
});
type Values = z.infer<typeof schema>;

export function JobDialog({
  open,
  onOpenChange,
  job,
  inline,
}: {
  inline?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  job?: Job | null;
}) {
  const { createJob, updateJob } = useAts();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", location: "", description: "", status: "open" },
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open)
      reset(
        job
          ? {
              title: job.title,
              location: job.location,
              description: job.description,
              status: job.status,
            }
          : { title: "", location: "", description: "", status: "open" },
      );
  }, [open, job, reset]);

  const onSubmit = (v: Values) => {
    if (job) updateJob(job.id, v);
    else createJob(v);
    onOpenChange(false);
  };
  const status = watch("status");

  return inline ? (
    open ? (
      <div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className={labelClass} htmlFor="job-title">
              Titel <span className="text-error">*</span>
            </label>
            <input
              id="job-title"
              className={inputClass}
              placeholder="t.ex. Senior Fullstackutvecklare"
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <label className={labelClass} htmlFor="job-loc">
              Plats <span className="text-error">*</span>
            </label>
            <input
              id="job-loc"
              className={inputClass}
              placeholder="t.ex. Stockholm (hybrid)"
              {...register("location")}
            />
            <FieldError message={errors.location?.message} />
          </div>
          <div>
            <label className={labelClass} htmlFor="job-desc">
              Beskrivning
            </label>
            <textarea
              id="job-desc"
              rows={3}
              className={cn(inputClass, "h-auto py-2.5")}
              placeholder="Kort beskrivning av rollen…"
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div>
            <span className={labelClass}>Status</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {(
                [
                  { v: "open", t: "Öppen", d: "Tar emot kandidater" },
                  { v: "closed", t: "Stängd", d: "Arkiverad/inaktiv" },
                ] as const
              ).map((o) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={status === o.v}
                  key={o.v}
                  onClick={() => setValue("status", o.v)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-surface-low p-3 text-left transition",
                    status === o.v
                      ? "border-primary/60 ring-2 ring-primary/20"
                      : "border-border hover:bg-surface-high",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                      status === o.v ? "border-primary bg-primary" : "border-faint",
                    )}
                  >
                    {status === o.v && <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />}
                  </span>
                  <span>
                    <span className="block font-display text-[13px] font-semibold">{o.t}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.d}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" variant="gradient">
              <Check /> Spara tjänst
            </Button>
          </div>
        </form>
      </div>
    ) : null
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-surface sm:max-w-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 label-caps text-accent-3">
            <FilePlus2 className="h-3.5 w-3.5" /> {job ? "Redigera tjänst" : "Ny tjänst"}
          </div>
          <DialogTitle className="font-display text-xl font-bold">
            {job ? "Redigera tjänst" : "Skapa ny tjänst"}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Fyll i grundläggande information för tjänsten.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className={labelClass} htmlFor="job-title">
              Titel <span className="text-error">*</span>
            </label>
            <input
              id="job-title"
              className={inputClass}
              placeholder="t.ex. Senior Fullstackutvecklare"
              {...register("title")}
            />
            <FieldError message={errors.title?.message} />
          </div>
          <div>
            <label className={labelClass} htmlFor="job-loc">
              Plats <span className="text-error">*</span>
            </label>
            <input
              id="job-loc"
              className={inputClass}
              placeholder="t.ex. Stockholm (hybrid)"
              {...register("location")}
            />
            <FieldError message={errors.location?.message} />
          </div>
          <div>
            <label className={labelClass} htmlFor="job-desc">
              Beskrivning
            </label>
            <textarea
              id="job-desc"
              rows={3}
              className={cn(inputClass, "h-auto py-2.5")}
              placeholder="Kort beskrivning av rollen…"
              {...register("description")}
            />
            <FieldError message={errors.description?.message} />
          </div>
          <div>
            <span className={labelClass}>Status</span>
            <div className="grid grid-cols-2 gap-3" role="radiogroup">
              {(
                [
                  { v: "open", t: "Öppen", d: "Tar emot kandidater" },
                  { v: "closed", t: "Stängd", d: "Arkiverad/inaktiv" },
                ] as const
              ).map((o) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={status === o.v}
                  key={o.v}
                  onClick={() => setValue("status", o.v)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-surface-low p-3 text-left transition",
                    status === o.v
                      ? "border-primary/60 ring-2 ring-primary/20"
                      : "border-border hover:bg-surface-high",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                      status === o.v ? "border-primary bg-primary" : "border-faint",
                    )}
                  >
                    {status === o.v && <span className="h-1.5 w-1.5 rounded-full bg-on-primary" />}
                  </span>
                  <span>
                    <span className="block font-display text-[13px] font-semibold">{o.t}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.d}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" variant="gradient">
              <Check /> Spara tjänst
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
