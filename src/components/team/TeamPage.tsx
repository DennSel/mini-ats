import { useState } from "react";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAts } from "@/lib/ats-store";
import { isLastOwner } from "@/lib/ats-logic";
import { FEATURES } from "@/lib/features";
import { ORG_ROLES, type OrgRole, type User } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
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
import {
  Avatar,
  NoActiveOrgState,
  ViewLabel,
  WithSidePanel,
  useIsDesktop,
  usePersistentState,
  FieldError,
  inputClass,
  labelClass,
} from "@/components/shared";
import { OrgRoleSelect } from "./OrgRoleSelect";
import { JobAccessMenu } from "./JobAccessMenu";

const schema = z.object({
  name: z.string().trim().min(2, "Ange namn (minst 2 tecken)").max(100),
  email: z.string().trim().min(1, "Ange e-postadress").email("Ogiltig e-postadress").max(255),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(100),
  orgRole: z.enum(["owner", "member", "viewer"]),
});
type Values = z.infer<typeof schema>;

export function TeamPage() {
  const { users, jobs, currentUser, activeOrgId, activeOrg, createUser, updateUser, deleteUser } =
    useAts();
  const allOrgJobs = jobs.filter((j) => j.orgId === activeOrgId);
  const desktop = useIsDesktop();
  const [rawOpen, setOpen] = usePersistentState<boolean | null>("team.invite", null);
  const open = rawOpen ?? desktop;
  const [remove, setRemove] = useState<User | null>(null);
  const members = users.filter((u) => u.role === "customer" && u.orgId === activeOrgId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", orgRole: "member" },
  });
  const inviteRole = watch("orgRole");

  const [inviteJobs, setInviteJobs] = useState<string[] | undefined>(undefined);
  const onSubmit = (v: Values) => {
    if (users.some((u) => u.email.toLowerCase() === v.email.toLowerCase())) {
      toast.error("E-postadressen används redan");
      return;
    }
    createUser({
      name: v.name,
      email: v.email,
      password: v.password,
      role: "customer",
      orgRole: v.orgRole,
      orgId: activeOrgId,
      ...(v.orgRole !== "owner" && inviteJobs ? { jobIds: inviteJobs } : {}),
    });
    setInviteJobs(undefined);
    reset({ name: "", email: "", password: "", orgRole: "member" });
    setOpen(false);
  };

  const changeRole = (u: User, orgRole: OrgRole) => {
    if (orgRole !== "owner" && isLastOwner(users, u.id)) {
      toast.error("Organisationen måste ha minst en ägare");
      return;
    }
    updateUser(u.id, { orgRole });
  };

  const setJobAccess = (id: string, jobIds: string[] | undefined) => {
    updateUser(id, { jobIds });
  };

  const inviteForm = (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="t-name" className={labelClass}>
          Namn
        </label>
        <input id="t-name" className={inputClass} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <label htmlFor="t-email" className={labelClass}>
          E-post
        </label>
        <input id="t-email" type="email" className={inputClass} {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <label htmlFor="t-password" className={labelClass}>
          Tillfälligt lösenord
        </label>
        <input
          id="t-password"
          type="password"
          autoComplete="new-password"
          placeholder="Minst 8 tecken"
          className={inputClass}
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <div>
        <span className={labelClass}>Roll</span>
        <Controller
          control={control}
          name="orgRole"
          render={({ field }) => <OrgRoleSelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      {FEATURES.jobAccess && (
        <div>
          <span className={labelClass}>Tjänsteåtkomst</span>
          <JobAccessMenu
            orgRole={inviteRole}
            jobIds={inviteJobs}
            jobs={allOrgJobs}
            onChange={setInviteJobs}
            className="sm:w-full"
          />
        </div>
      )}
      <Button type="submit" variant="gradient" className="w-full">
        <UserPlus /> Bjud in
      </Button>
    </form>
  );

  if (!activeOrgId || !activeOrg) {
    return <NoActiveOrgState />;
  }

  return (
    <WithSidePanel
      side={open ? inviteForm : null}
      title="Bjud in medarbetare"
      onClose={() => setOpen(false)}
    >
      <div>
        <div className="min-w-0">
          <div className="glass mb-3 flex flex-col gap-2 rounded-2xl p-2 pl-4">
            <ViewLabel title="Medarbetare" org={activeOrg?.name} />
            <Button variant="gradient" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
              <UserPlus /> Bjud in medarbetare
            </Button>
          </div>
          <div className="glass-card overflow-hidden rounded-2xl">
            {members.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:flex"
              >
                <Avatar name={u.name} size="sm" />
                <div className="min-w-0 sm:flex-1">
                  <div className="truncate font-display text-[13px] font-semibold">
                    {u.name}{" "}
                    {u.id === currentUser?.id && (
                      <span className="text-[11px] font-normal text-faint">(du)</span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                </div>
                <div className="col-span-3 row-start-2 grid grid-cols-2 gap-2 sm:contents">
                  {FEATURES.teamRoleChange ? (
                    <OrgRoleSelect
                      value={u.orgRole}
                      onChange={(r) => changeRole(u, r)}
                      className="w-full sm:w-36"
                    />
                  ) : (
                    <span className="inline-flex rounded-full border border-accent-3/30 bg-accent-3/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-3">
                      {ORG_ROLES.find((r) => r.id === u.orgRole)?.label}
                    </span>
                  )}
                  {FEATURES.jobAccess && (
                    <JobAccessMenu
                      orgRole={u.orgRole}
                      jobIds={u.jobIds}
                      name={u.name}
                      jobs={allOrgJobs}
                      onChange={(jobIds) => setJobAccess(u.id, jobIds)}
                    />
                  )}
                </div>
                {FEATURES.teamRemoveMember && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Ta bort ${u.name}`}
                    disabled={u.id === currentUser?.id || isLastOwner(users, u.id)}
                    className="text-faint hover:bg-error-bg hover:text-error"
                    onClick={() => setRemove(u)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {members.length === 0 && (
              <p className="p-8 text-center text-muted-foreground">Inga medarbetare ännu.</p>
            )}
          </div>
        </div>

        <AlertDialog open={!!remove} onOpenChange={(o) => !o && setRemove(null)}>
          <AlertDialogContent className="rounded-2xl border-border bg-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Ta bort medarbetare?</AlertDialogTitle>
              <AlertDialogDescription>
                {remove?.name} förlorar åtkomst till organisationen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-on-primary hover:bg-destructive/90"
                onClick={() => {
                  if (remove) deleteUser(remove.id);
                  setRemove(null);
                }}
              >
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </WithSidePanel>
  );
}
