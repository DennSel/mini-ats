import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { loadUser, signOut } from "./auth";
import { supabase } from "./supabase";
import type { Candidate, Job, Organization, Stage, User } from "./types";
import {
  activeOrgFor,
  visibleCandidates,
  visibleJobs,
  can as canDo,
  type Permission,
} from "./ats-logic";
import {
  fetchCandidates,
  fetchJobs,
  planMoveCandidate,
  positionBetween,
  toOrganization,
  toUser,
  type CandidateRow,
  type JobRow,
  type OrgRow,
  type PlannedMove,
  type ProfileRow,
} from "./position";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export type JobInput = Omit<Job, "id" | "orgId" | "createdAt">;
export type CandidateInput = Omit<
  Candidate,
  "id" | "orgId" | "createdAt" | "createdBy" | "stage" | "links" | "position"
> & {
  stage?: Stage;
  links?: Candidate["links"];
  position?: number;
};
export type UserInput = Omit<User, "id">;

interface AtsState {
  users: User[];
  organizations: Organization[];
  jobs: Job[];
  candidates: Candidate[];
  currentUser: User | null;
  authReady: boolean;
  selectedOrgId: string | null;
  activeOrgId: string | null;
  activeOrg: Organization | null;
  /** Jobs/candidates of the active org that the current user may see */
  orgJobs: Job[];
  orgCandidates: Candidate[];
  refreshUser: () => Promise<User | null>;
  logout: () => Promise<void>;
  selectOrg: (id: string) => void;
  createJob: (input: JobInput) => void;
  updateJob: (id: string, input: Partial<JobInput>) => void;
  createCandidate: (input: CandidateInput) => void;
  updateCandidate: (id: string, input: Partial<Omit<Candidate, "id">>) => void;
  deleteCandidate: (id: string) => void;
  moveCandidate: (id: string, stage: Stage, beforeId?: string | null) => void;
  assignCandidate: (id: string, jobId: string | null) => void;
  addLink: (id: string, label: string, url: string) => void;
  removeLink: (id: string, linkId: string) => void;
  createUser: (input: UserInput, newOrgName?: string) => void;
  updateUser: (id: string, input: Partial<Omit<User, "id">>) => void;
  deleteUser: (id: string) => void;
  createOrg: (name: string) => void;
  updateOrg: (id: string, name: string) => void;
  deleteOrg: (id: string) => void;
  can: (perm: Permission) => boolean;
}

// Keep one context instance across hot reloads so providers and consumers always match.
const g = globalThis as unknown as { __atsContext?: React.Context<AtsState | null> };
const AtsContext = (g.__atsContext ??= createContext<AtsState | null>(null));

export function AtsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const u = await loadUser();
    setCurrentUser(u);
    setAuthReady(true);
    return u;
  }, []);

  useEffect(() => {
    let active = true;
    loadUser()
      .then((u) => {
        if (active) {
          setCurrentUser(u);
          setAuthReady(true);
        }
      })
      .catch(() => {
        if (active) setAuthReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setAuthReady(true);
        return;
      }
      void loadUser().then((u) => {
        if (active) {
          setCurrentUser(u);
          setAuthReady(true);
        }
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const orgsQuery = useQuery({
    queryKey: ["orgs"],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgs")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as OrgRow[]).map(toOrganization);
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    enabled: !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as ProfileRow[]).map(toUser);
    },
  });

  const organizations = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data]);
  const users = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  const effectiveSelectedOrgId = useMemo(() => {
    if (selectedOrgId && organizations.some((o) => o.id === selectedOrgId)) {
      return selectedOrgId;
    }
    return organizations[0]?.id ?? null;
  }, [selectedOrgId, organizations]);

  const activeOrgId = activeOrgFor(currentUser, effectiveSelectedOrgId);
  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;

  const jobsQuery = useQuery({
    queryKey: ["jobs", activeOrgId],
    enabled: !!currentUser && !!activeOrgId,
    queryFn: () => fetchJobs(activeOrgId!),
  });

  const candidatesQuery = useQuery({
    queryKey: ["candidates", activeOrgId],
    enabled: !!currentUser && !!activeOrgId,
    queryFn: () => fetchCandidates(activeOrgId!),
  });

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const candidates = useMemo(() => candidatesQuery.data ?? [], [candidatesQuery.data]);

  const orgJobs = useMemo(
    () => visibleJobs(currentUser, jobs, activeOrgId),
    [currentUser, jobs, activeOrgId],
  );
  const orgCandidates = useMemo(
    () => visibleCandidates(currentUser, candidates, activeOrgId),
    [currentUser, candidates, activeOrgId],
  );

  const createOrgMut = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("orgs").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orgs"] }),
    onError: () => toast.error("Kunde inte skapa organisationen"),
  });

  const updateOrgMut = useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      const { error } = await supabase.from("orgs").update({ name: v.name }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["orgs"] }),
    onError: () => toast.error("Kunde inte uppdatera organisationen"),
  });

  const deleteOrgMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orgs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      setSelectedOrgId((s) =>
        s === id ? (organizations.find((o) => o.id !== id)?.id ?? null) : s,
      );
      void qc.invalidateQueries({ queryKey: ["orgs"] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: () => toast.error("Kunde inte ta bort organisationen"),
  });

  const createJobMut = useMutation({
    mutationFn: async (input: JobInput) => {
      if (!activeOrgId) throw new Error("Ingen aktiv organisation");
      const { error } = await supabase.from("jobs").insert({
        org_id: activeOrgId,
        title: input.title,
        location: input.location,
        description: input.description,
        status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["jobs", activeOrgId] }),
    onError: () => toast.error("Kunde inte skapa tjänsten"),
  });

  const updateJobMut = useMutation({
    mutationFn: async (v: { id: string; input: Partial<JobInput> }) => {
      const patch: Partial<JobRow> = {};
      if (v.input.title !== undefined) patch.title = v.input.title;
      if (v.input.location !== undefined) patch.location = v.input.location;
      if (v.input.description !== undefined) patch.description = v.input.description;
      if (v.input.status !== undefined) patch.status = v.input.status;
      const { error } = await supabase.from("jobs").update(patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["jobs", activeOrgId] }),
    onError: () => toast.error("Kunde inte uppdatera tjänsten"),
  });

  const createCandidateMut = useMutation({
    mutationFn: async (input: CandidateInput) => {
      if (!activeOrgId) throw new Error("Ingen aktiv organisation");
      const stage = input.stage ?? "new";
      const inStage = candidates
        .filter((c) => c.orgId === activeOrgId && c.stage === stage)
        .sort((a, b) => a.position - b.position);
      const lastPos = inStage[inStage.length - 1]?.position;
      const position = input.position ?? positionBetween(lastPos, undefined);

      const { error } = await supabase.from("candidates").insert({
        org_id: activeOrgId,
        job_id: input.jobId ?? null,
        name: input.name,
        email: input.email,
        phone: input.phone,
        linkedin: input.linkedin,
        note: input.note,
        links: input.links ?? [],
        interview_at: input.interviewAt ? input.interviewAt : null,
        interview_link: input.interviewLink ? input.interviewLink : null,
        stage,
        position,
        created_by: currentUser?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
    onError: () => toast.error("Kunde inte lägga till kandidaten"),
  });

  const updateCandidateMut = useMutation({
    mutationFn: async (v: { id: string; input: Partial<Omit<Candidate, "id">> }) => {
      const patch: Partial<CandidateRow> = {};
      if (v.input.name !== undefined) patch.name = v.input.name;
      if (v.input.email !== undefined) patch.email = v.input.email;
      if (v.input.phone !== undefined) patch.phone = v.input.phone;
      if (v.input.linkedin !== undefined) patch.linkedin = v.input.linkedin;
      if (v.input.note !== undefined) patch.note = v.input.note;
      if ("links" in v.input) patch.links = v.input.links ?? [];
      if ("interviewAt" in v.input) {
        patch.interview_at = v.input.interviewAt ? v.input.interviewAt : null;
      }
      if ("interviewLink" in v.input) {
        patch.interview_link = v.input.interviewLink ? v.input.interviewLink : null;
      }
      if ("jobId" in v.input) patch.job_id = v.input.jobId ?? null;
      if (v.input.stage !== undefined) patch.stage = v.input.stage;
      if (v.input.position !== undefined) patch.position = v.input.position;

      const { error } = await supabase.from("candidates").update(patch).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
    onError: () => toast.error("Kunde inte uppdatera kandidaten"),
  });

  const deleteCandidateMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
    onError: () => toast.error("Kunde inte radera kandidaten"),
  });

  const moveCandidateMut = useMutation({
    mutationFn: async (v: PlannedMove) => {
      if (v.renumbered) {
        const results = await Promise.all(
          v.renumbered.map((r) =>
            supabase
              .from("candidates")
              .update({ stage: r.stage, position: r.position })
              .eq("id", r.id),
          ),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
        return;
      }
      const { error } = await supabase
        .from("candidates")
        .update({ stage: v.stage, position: v.position })
        .eq("id", v.id);
      if (error) throw error;
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["candidates", activeOrgId] });
      const prev = qc.getQueryData<Candidate[]>(["candidates", activeOrgId]);
      qc.setQueryData<Candidate[]>(["candidates", activeOrgId], (old) => {
        const list = old ?? [];
        if (v.renumbered) {
          const map = new Map(v.renumbered.map((r) => [r.id, r]));
          return list
            .map((c) => {
              const r = map.get(c.id);
              return r ? { ...c, stage: r.stage, position: r.position } : c;
            })
            .sort((a, b) => a.position - b.position);
        }
        return list
          .map((c) => (c.id === v.id ? { ...c, stage: v.stage, position: v.position } : c))
          .sort((a, b) => a.position - b.position);
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["candidates", activeOrgId], ctx?.prev);
      toast.error("Kunde inte flytta kandidaten");
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
  });

  const logout = useCallback(async () => {
    await signOut();
    setCurrentUser(null);
    qc.clear();
  }, [qc]);

  const value = useMemo<AtsState>(
    () => ({
      users,
      organizations,
      jobs,
      candidates,
      currentUser,
      authReady,
      selectedOrgId: effectiveSelectedOrgId,
      activeOrgId,
      activeOrg,
      orgJobs,
      orgCandidates,
      refreshUser,
      logout,
      selectOrg: setSelectedOrgId,
      createJob: (input) => {
        if (!activeOrgId) return;
        createJobMut.mutate(input);
      },
      updateJob: (id, input) => {
        updateJobMut.mutate({ id, input });
      },
      createCandidate: (input) => {
        if (!activeOrgId) return;
        createCandidateMut.mutate(input);
      },
      updateCandidate: (id, input) => {
        updateCandidateMut.mutate({ id, input });
      },
      deleteCandidate: (id) => {
        deleteCandidateMut.mutate(id);
      },
      moveCandidate: (id, stage, beforeId) => {
        const planned = planMoveCandidate(candidates, id, stage, beforeId);
        if (!planned) return;
        moveCandidateMut.mutate(planned);
      },
      assignCandidate: (id, jobId) => {
        const c = candidates.find((x) => x.id === id);
        if (!c || c.jobId === jobId) return;
        const inNew = candidates
          .filter((x) => x.orgId === c.orgId && x.id !== id && x.stage === "new")
          .sort((a, b) => a.position - b.position);
        const lastPos = inNew[inNew.length - 1]?.position;
        updateCandidateMut.mutate({
          id,
          input: {
            jobId,
            stage: "new",
            position: positionBetween(lastPos, undefined),
          },
        });
      },
      addLink: (id, label, url) => {
        const c = candidates.find((x) => x.id === id);
        if (!c) return;
        updateCandidateMut.mutate({
          id,
          input: { links: [...c.links, { id: uid("l"), label, url }] },
        });
      },
      removeLink: (id, linkId) => {
        const c = candidates.find((x) => x.id === id);
        if (!c) return;
        updateCandidateMut.mutate({
          id,
          input: { links: c.links.filter((l) => l.id !== linkId) },
        });
      },
      updateUser: () => {
        throw new Error("Inte implementerat");
      },
      deleteUser: () => {
        throw new Error("Inte implementerat");
      },
      createOrg: (name) => {
        createOrgMut.mutate(name);
      },
      updateOrg: (id, name) => {
        updateOrgMut.mutate({ id, name });
      },
      deleteOrg: (id) => {
        deleteOrgMut.mutate(id);
      },
      can: (perm) => canDo(currentUser, perm),
      createUser: () => {
        throw new Error("Inte implementerat");
      },
    }),
    [
      users,
      organizations,
      jobs,
      candidates,
      currentUser,
      authReady,
      effectiveSelectedOrgId,
      activeOrgId,
      activeOrg,
      orgJobs,
      orgCandidates,
      refreshUser,
      logout,
      createJobMut,
      updateJobMut,
      createCandidateMut,
      updateCandidateMut,
      deleteCandidateMut,
      moveCandidateMut,
      createOrgMut,
      updateOrgMut,
      deleteOrgMut,
    ],
  );

  return <AtsContext.Provider value={value}>{children}</AtsContext.Provider>;
}

export function useAts() {
  const ctx = useContext(AtsContext);
  if (!ctx) throw new Error("useAts must be used inside AtsProvider");
  return ctx;
}
