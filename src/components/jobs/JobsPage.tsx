import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Briefcase, Kanban, Lock, MapPin, Pencil, Plus, Search, Unlock } from "lucide-react";
import { useAts } from "@/lib/ats-store";
import type { Job } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared";
import { cn } from "@/lib/utils";
import { JobDialog } from "./JobDialog";
import { WithSidePanel, useIsDesktop, usePersistentState } from "@/components/shared";

type Filter = "all" | "open" | "closed";

export function JobsPage() {
  const { jobs, candidates, activeOrgId, updateJob, can, orgJobs } = useAts();
  const canJobs = can("manageJobs");
  const [filter, setFilter] = usePersistentState<Filter>("jobs.filter", "all");
  const [q, setQ] = usePersistentState("jobs.q", "");
  const desktop = useIsDesktop();
  const [rawDialog, setDialog] = usePersistentState<{ open: boolean | null; job: Job | null }>(
    "jobs.dialog",
    {
      open: null,
      job: null,
    },
  );

  const dialog = { job: rawDialog.job, open: rawDialog.open ?? (desktop && canJobs) };

  const counts = {
    all: orgJobs.length,
    open: orgJobs.filter((j) => j.status === "open").length,
    closed: orgJobs.filter((j) => j.status === "closed").length,
  };
  const visible = orgJobs.filter(
    (j) =>
      (filter === "all" || j.status === filter) &&
      (!q.trim() || `${j.title} ${j.location}`.toLowerCase().includes(q.trim().toLowerCase())),
  );
  const candCount = (id: string) => candidates.filter((c) => c.jobId === id).length;

  const actions = (j: Job) => (
    <div className="flex flex-nowrap items-center justify-between gap-1 md:justify-end md:gap-1.5 [&_a]:px-2 [&_button]:px-2 md:[&_a]:px-3 md:[&_button]:px-3">
      {canJobs && (
        <>
          <Button size="sm" variant="ghost" onClick={() => setDialog({ open: true, job: j })}>
            <Pencil /> Redigera
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateJob(j.id, { status: j.status === "open" ? "closed" : "open" })}
          >
            {j.status === "open" ? (
              <>
                <Lock /> Stäng
              </>
            ) : (
              <>
                <Unlock /> Öppna
              </>
            )}
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" asChild className="border-primary/30 text-primary">
        <Link to="/board" search={{ job: j.id, q: "" }}>
          <Kanban /> Visa i pipeline
        </Link>
      </Button>
    </div>
  );

  const closeDialog = () => setDialog((d) => ({ ...d, open: false }));
  return (
    <WithSidePanel
      side={
        desktop && dialog.open ? (
          <JobDialog inline open job={dialog.job} onOpenChange={(o) => !o && closeDialog()} />
        ) : null
      }
      title={dialog.job ? "Redigera tjänst" : "Ny tjänst"}
      onClose={closeDialog}
    >
      <div>
        <div className="glass flex flex-col gap-3 rounded-2xl p-2 sm:flex-row sm:items-center">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                ["all", "Alla"],
                ["open", "Öppna"],
                ["closed", "Stängda"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 font-display text-[12px] font-semibold transition",
                  filter === k
                    ? "nav-active text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-surface-high",
                )}
              >
                {label}
                <span className="font-mono text-[11px] text-faint">{counts[k]}</span>
              </button>
            ))}
          </div>
          <div className="relative min-w-10 shrink sm:ml-auto sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sök tjänst…"
              className="h-9 w-full rounded-xl border border-border bg-surface-low pl-9 pr-3 text-[13px] outline-none placeholder:text-faint focus:border-primary/60"
            />
          </div>
          {canJobs && (
            <Button variant="gradient" onClick={() => setDialog({ open: true, job: null })}>
              <Plus className="icon-rotate" /> Ny tjänst
            </Button>
          )}
        </div>

        {/* Desktop table */}
        <div className="glass-card mt-4 hidden overflow-x-auto rounded-2xl md:block">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border label-caps text-faint">
                <th className="px-5 py-3 font-bold">Titel</th>
                <th className="px-4 py-3 font-bold">Plats</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Kandidater</th>
                <th className="px-5 py-3 text-right font-bold">Åtgärder</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr
                  key={j.id}
                  className={cn(
                    "border-b border-border last:border-0 transition hover:bg-surface-high/50",
                    j.status === "closed" && "opacity-60",
                  )}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <span className="font-display text-[14px] font-semibold">{j.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-low px-2.5 py-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {j.location}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={j.status} />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[13px]">{candCount(j.id)}</td>
                  <td className="px-5 py-3.5">{actions(j)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <Empty />}
        </div>

        {/* Mobile cards */}
        <div className="mt-4 space-y-3 md:hidden">
          {visible.map((j) => (
            <div
              key={j.id}
              className={cn("glass-card rounded-2xl p-4", j.status === "closed" && "opacity-60")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-[14px] font-semibold">{j.title}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {j.location}
                    </div>
                  </div>
                </div>
                <StatusPill status={j.status} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[12px] text-muted-foreground">
                <span>
                  Kandidater{" "}
                  <span className="ml-1 font-mono text-foreground">{candCount(j.id)}</span>
                </span>
              </div>
              <div className="mt-2">{actions(j)}</div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="glass-card rounded-2xl">
              <Empty />
            </div>
          )}
        </div>

        <JobDialog
          open={dialog.open && !desktop}
          job={dialog.job}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        />
      </div>
    </WithSidePanel>
  );
}

function Empty() {
  return (
    <div className="px-5 py-10 text-center text-[13px] text-muted-foreground">
      Ingen tjänst hittades.
    </div>
  );
}
