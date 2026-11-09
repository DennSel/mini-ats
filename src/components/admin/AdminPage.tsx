import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Check, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAts } from "@/lib/ats-store";
import { isLastOwner } from "@/lib/ats-logic";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  BuildingComplexPlus,
  WithSidePanel,
  useIsDesktop,
  usePersistentState,
  FieldError,
  SearchInput,
  ViewLabel,
  inputClass,
  labelClass,
} from "@/components/shared";
import { OrgRoleSelect } from "@/components/team/OrgRoleSelect";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import { ORG_ROLES, type Organization, type User } from "@/lib/mock-data";

const NEW_ORG = "__new";
const ALL = "__all";
const NONE = "__none";

const userSchema = z
  .object({
    name: z.string().trim().min(2, "Ange namn (minst 2 tecken)").max(100),
    email: z.string().trim().min(1, "Ange e-postadress").email("Ogiltig e-postadress").max(255),
    password: z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(100),
    role: z.enum(["admin", "customer"]),
    orgRole: z.enum(["owner", "member", "viewer"]),
    orgId: z.string(),
    newOrgName: z.string().trim().max(100),
  })
  .superRefine((v, ctx) => {
    if (v.role === "customer" && !v.orgId)
      ctx.addIssue({ code: "custom", path: ["orgId"], message: "Välj en organisation" });
    if (v.orgId === NEW_ORG && v.newOrgName.length < 2)
      ctx.addIssue({ code: "custom", path: ["newOrgName"], message: "Ange organisationens namn" });
  });
type UserValues = z.infer<typeof userSchema>;
const emptyUser: UserValues = {
  name: "",
  email: "",
  password: "",
  role: "customer",
  orgRole: "owner",
  orgId: "",
  newOrgName: "",
};

export function AdminPage() {
  const { users, organizations, currentUser, createUser, updateUser, deleteUser, deleteOrg } =
    useAts();
  const desktop = useIsDesktop(640);
  const [tab, setTab] = usePersistentState<"users" | "orgs">("admin.tab", "users");
  const [panels, setPanels] = usePersistentState<{ user: boolean | null; org: boolean | null }>(
    "admin.panels",
    {
      user: null,
      org: null,
    },
  );
  const userOpen = panels.user ?? desktop;
  const orgOpen = panels.org ?? desktop;
  const panel: "user" | "org" | null =
    tab === "users" ? (userOpen ? "user" : null) : orgOpen ? "org" : null;
  const setPanel = (p: "user" | "org" | null) =>
    setPanels((s) =>
      p ? { ...s, [p]: true } : { ...s, [tab === "users" ? "user" : "org"]: false },
    );
  const [q, setQ] = usePersistentState("admin.q", "");
  const [orgFilter, setOrgFilter] = usePersistentState<string>("admin.org", ALL);
  const [roleFilter, setRoleFilter] = usePersistentState<string>("admin.role", ALL);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [removeUser, setRemoveUser] = useState<User | null>(null);
  const [orgDialog, setOrgDialog] = useState<{ open: boolean; org: Organization | null }>({
    open: false,
    org: null,
  });
  const [removeOrg, setRemoveOrg] = useState<Organization | null>(null);
  const query = q.trim().toLowerCase();
  const orgName = (id: string | null) => organizations.find((o) => o.id === id)?.name ?? "–";
  const memberCount = (id: string) => users.filter((u) => u.orgId === id).length;

  const visibleUsers = users.filter(
    (u) =>
      (orgFilter === ALL || (orgFilter === NONE ? !u.orgId : u.orgId === orgFilter)) &&
      (roleFilter === ALL ||
        (roleFilter === "admin"
          ? u.role === "admin"
          : u.role === "customer" && u.orgRole === roleFilter)) &&
      (!query || `${u.name} ${u.email}`.toLowerCase().includes(query)),
  );
  const visibleOrgs = organizations.filter((o) => !query || o.name.toLowerCase().includes(query));

  const form = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: emptyUser });

  const onCreate = (v: UserValues) => {
    if (users.some((u) => u.email.toLowerCase() === v.email.toLowerCase())) {
      toast.error("E-postadressen används redan");
      return;
    }
    const isNew = v.orgId === NEW_ORG;
    createUser(
      {
        name: v.name,
        email: v.email,
        password: v.password,
        role: v.role,
        orgRole: v.orgRole,
        orgId: isNew ? null : v.orgId || null,
      },
      isNew ? v.newOrgName : undefined,
    );
    form.reset(emptyUser);
    setPanel(null);
  };

  return (
    <div className="space-y-4">
      <div className="glass flex flex-col gap-2 rounded-2xl p-2.5 pl-4">
        <ViewLabel>Admin</ViewLabel>
        {/* Tabs: stacked vertically on smaller screens (flex-col), horizontal on xl (xl:flex-row) */}
        <div className="flex shrink-0 gap-1">
          {(
            [
              ["users", "Användare", users.length],
              ["orgs", "Organisationer", organizations.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "flex items-center justify-between sm:justify-start gap-2 rounded-xl border px-3 py-1.5 font-display text-[12px] font-semibold transition",
                tab === k
                  ? "nav-active text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-surface-high",
              )}
            >
              <span>{label}</span>
              <span className="font-mono text-[11px] text-faint">{n}</span>
            </button>
          ))}
        </div>

        {/* Right section: 2x2 grid on smaller screens, flex row on xl */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Roll-filter */}
            {tab === "users" && (
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger
                  className="h-9 w-36 shrink-0 rounded-xl border-border bg-surface-low"
                  aria-label="Filtrera på roll"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla roller</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {ORG_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 2. Organisations-filter */}
            {tab === "users" ? (
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger
                  className="h-9 w-44 shrink-0 rounded-xl border-border bg-surface-low"
                  aria-label="Filtrera på organisation"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Alla organisationer</SelectItem>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NONE}>Utan organisation</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            {/* 3. Search field */}
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Sök…"
              className="min-w-9 basis-24 md:max-w-none"
            />

            {/* 4. Create user button */}
            <Button
              variant="gradient"
              className="shrink-0"
              onClick={() => setPanel(tab === "users" ? "user" : "org")}
            >
              {tab === "users" ? <UserPlus /> : <BuildingComplexPlus />}
              {tab === "users" ? "Skapa användare" : "Ny organisation"}
            </Button>
          </div>
        </div>
      </div>
      <WithSidePanel
        side={
          panel === "user" ? (
            <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4" noValidate>
              <UserFields form={form} allowNewOrg />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
                  Avbryt
                </Button>
                <Button type="submit" variant="gradient">
                  <Check /> Skapa användare
                </Button>
              </div>
            </form>
          ) : panel === "org" ? (
            <NewOrgForm onDone={() => setPanel(null)} />
          ) : null
        }
        title={panel === "org" ? "Ny organisation" : "Skapa användare"}
        onClose={() => setPanel(null)}
      >
        <div>
          <div>
            <div className="min-w-0">
              {tab === "users" ? (
                <div className="glass-card mt-4 overflow-hidden rounded-2xl">
                  {visibleUsers.map((u) => (
                    <div
                      key={u.id}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-high/50 sm:flex"
                    >
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0 sm:flex-1">
                        <div className="truncate font-display text-[13px] font-semibold">
                          {u.name}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                      <div className="col-span-3 row-start-2 mt-1 sm:contents sm:mt-0">
                        {u.role === "customer" && FEATURES.teamRoleChange ? (
                          <OrgRoleSelect
                            value={u.orgRole}
                            onChange={(r) => updateUser(u.id, { orgRole: r })}
                            className="w-full sm:w-28"
                          />
                        ) : (
                          <RolePill user={u} />
                        )}
                        <div className="hidden truncate text-[13px] text-muted-foreground md:block md:w-44">
                          {orgName(u.orgId)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {FEATURES.adminEditUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Redigera ${u.name}`}
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil />
                          </Button>
                        )}
                        {FEATURES.adminDeleteUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Ta bort ${u.name}`}
                            disabled={u.id === currentUser?.id || isLastOwner(users, u.id)}
                            className="text-faint hover:bg-error-bg hover:text-error"
                            onClick={() => setRemoveUser(u)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {visibleUsers.length === 0 && (
                    <p className="p-8 text-center text-muted-foreground">
                      Inga användare hittades.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {visibleOrgs.map((o) => (
                    <div
                      key={o.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setOrgFilter(o.id);
                        setQ("");
                        setTab("users");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setOrgFilter(o.id);
                          setQ("");
                          setTab("users");
                        }
                      }}
                      className="glass-card group flex cursor-pointer items-center gap-3 rounded-2xl p-4 transition hover:border-primary/40"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-[14px] font-semibold">
                          {o.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-mono">{memberCount(o.id)}</span> användare · visa
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Byt namn på ${o.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrgDialog({ open: true, org: o });
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Ta bort ${o.name}`}
                        className="text-faint hover:bg-error-bg hover:text-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (memberCount(o.id) > 0)
                            toast.error("Flytta eller ta bort organisationens användare först");
                          else setRemoveOrg(o);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  {visibleOrgs.length === 0 && (
                    <p className="text-muted-foreground">Inga organisationer hittades.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />
          <OrgDialog state={orgDialog} onClose={() => setOrgDialog({ open: false, org: null })} />

          <AlertDialog open={!!removeUser} onOpenChange={(o) => !o && setRemoveUser(null)}>
            <AlertDialogContent className="rounded-2xl border-border bg-surface">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Ta bort användare?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeUser?.name} tas bort permanent och kan inte längre logga in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-destructive text-on-primary hover:bg-destructive/90"
                  onClick={() => {
                    if (removeUser) deleteUser(removeUser.id);
                    setRemoveUser(null);
                  }}
                >
                  Ta bort
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={!!removeOrg} onOpenChange={(o) => !o && setRemoveOrg(null)}>
            <AlertDialogContent className="rounded-2xl border-border bg-surface">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Ta bort organisation?</AlertDialogTitle>
                <AlertDialogDescription>
                  {removeOrg?.name} och alla dess tjänster och kandidater tas bort permanent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-xl bg-destructive text-on-primary hover:bg-destructive/90"
                  onClick={() => {
                    if (removeOrg) deleteOrg(removeOrg.id);
                    setRemoveOrg(null);
                  }}
                >
                  Ta bort
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </WithSidePanel>
    </div>
  );
}

function UserFields({
  form,
  allowNewOrg,
}: {
  form: ReturnType<typeof useForm<UserValues>>;
  allowNewOrg?: boolean;
}) {
  const { organizations } = useAts();
  const {
    register,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;
  const role = watch("role");
  const orgId = watch("orgId");
  useEffect(() => {
    if (allowNewOrg && organizations.length === 0 && !orgId) {
      setValue("orgId", NEW_ORG);
    }
  }, [allowNewOrg, organizations.length, orgId, setValue]);
  return (
    <>
      <div>
        <label htmlFor="u-name" className={labelClass}>
          Namn
        </label>
        <input id="u-name" className={inputClass} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <label htmlFor="u-email" className={labelClass}>
          E-post
        </label>
        <input id="u-email" type="email" className={inputClass} {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>
      {allowNewOrg && (
        <div>
          <label htmlFor="u-password" className={labelClass}>
            Tillfälligt lösenord
          </label>
          <input
            id="u-password"
            type="password"
            autoComplete="new-password"
            placeholder="Minst 8 tecken"
            className={inputClass}
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>
      )}
      <div>
        <span className={labelClass}>Typ</span>
        <div className="flex gap-2">
          {(
            [
              ["admin", "Admin"],
              ["customer", "Kund"],
            ] as const
          ).map(([k, l]) => (
            <button
              type="button"
              key={k}
              onClick={() => setValue("role", k, { shouldValidate: true })}
              className={cn(
                "flex-1 rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition",
                role === k
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border bg-surface-low text-muted-foreground hover:bg-surface-high",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {role === "customer" && (
        <>
          <div>
            <span className={labelClass}>Organisation</span>
            <Select
              value={orgId}
              onValueChange={(v) => setValue("orgId", v, { shouldValidate: true })}
            >
              <SelectTrigger className="h-10 rounded-xl border-border bg-surface-low">
                <SelectValue placeholder="Välj organisation" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
                {allowNewOrg && <SelectItem value={NEW_ORG}>+ Ny organisation…</SelectItem>}
              </SelectContent>
            </Select>
            <FieldError message={errors.orgId?.message} />
          </div>
          {orgId === NEW_ORG && (
            <div>
              <label htmlFor="u-org" className={labelClass}>
                Namn på ny organisation
              </label>
              <input id="u-org" className={inputClass} {...register("newOrgName")} />
              <FieldError message={errors.newOrgName?.message} />
            </div>
          )}
          <div>
            <span className={labelClass}>Roll i organisationen</span>
            <Controller
              control={control}
              name="orgRole"
              render={({ field }) => (
                <OrgRoleSelect value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
        </>
      )}
    </>
  );
}

function EditUserDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const { users, updateUser } = useAts();
  const form = useForm<UserValues>({ resolver: zodResolver(userSchema), defaultValues: emptyUser });
  useEffect(() => {
    if (user)
      form.reset({
        name: user.name,
        email: user.email,
        password: "placeholder-password",
        role: user.role,
        orgRole: user.orgRole,
        orgId: user.orgId ?? "",
        newOrgName: "",
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = (v: UserValues) => {
    if (!user) return;
    if (users.some((u) => u.id !== user.id && u.email.toLowerCase() === v.email.toLowerCase())) {
      toast.error("E-postadressen används redan");
      return;
    }
    const losesOwner =
      user.orgRole === "owner" &&
      (v.orgRole !== "owner" || v.orgId !== user.orgId || v.role !== "customer");
    if (losesOwner && isLastOwner(users, user.id)) {
      toast.error("Organisationen måste ha minst en ägare");
      return;
    }
    updateUser(user.id, {
      name: v.name,
      email: v.email,
      role: v.role,
      orgRole: v.orgRole,
      orgId: v.role === "admin" ? null : v.orgId,
    });
    onClose();
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-border bg-surface sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl font-bold">Redigera användare</DialogTitle>
          <DialogDescription className="text-[12px]">
            Ändra uppgifter, organisation och roll.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <UserFields form={form} />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" variant="gradient">
              <Check /> Spara
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OrgDialog({
  state,
  onClose,
}: {
  state: { open: boolean; org: Organization | null };
  onClose: () => void;
}) {
  const { createOrg, updateOrg } = useAts();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (state.open) {
      setName(state.org?.name ?? "");
      setError(undefined);
    }
  }, [state]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 100) {
      setError("Ange ett namn (2–100 tecken)");
      return;
    }
    if (state.org) updateOrg(state.org.id, n);
    else createOrg(n);
    onClose();
  };

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-surface sm:max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl font-bold">
            {state.org ? "Byt namn" : "Ny organisation"}
          </DialogTitle>
          <DialogDescription className="text-[12px]">Organisationens namn.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} noValidate className="space-y-4">
          <div>
            <label htmlFor="o-name" className={labelClass}>
              Namn
            </label>
            <input
              id="o-name"
              className={inputClass}
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
            <FieldError message={error} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" variant="gradient">
              <Check /> Spara
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RolePill({ user }: { user: User }) {
  if (user.role === "admin")
    return (
      <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
        Admin
      </span>
    );
  return (
    <span className="inline-flex rounded-full border border-accent-3/30 bg-accent-3/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent-3">
      {ORG_ROLES.find((r) => r.id === user.orgRole)?.label}
    </span>
  );
}

function NewOrgForm({ onDone }: { onDone: () => void }) {
  const { createOrg } = useAts();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const cancel = onDone;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 100) {
      setError("Ange ett namn (2–100 tecken)");
      return;
    }
    createOrg(n);
    setName("");
    setError(undefined);
    cancel();
  };
  return (
    <form onSubmit={save} noValidate className="space-y-3">
      <div>
        <input
          autoFocus
          aria-label="Organisationens namn"
          placeholder="Organisationens namn"
          className={inputClass}
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
        />
        <FieldError message={error} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={cancel}>
          Avbryt
        </Button>
        <Button type="submit" variant="gradient">
          <Check /> Spara
        </Button>
      </div>
    </form>
  );
}
