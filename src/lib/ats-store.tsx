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
import {
  createUser as createUserRpc,
  deleteOrg as deleteOrgRpc,
  deleteUser as deleteUserRpc,
  updateUser as updateUserRpc,
} from "./users.functions";
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
import {
  DEMO_NORDVIK_ID,
  DEMO_TEAM_MEMBERS,
  DEMO_USERS,
  INITIAL_DEMO_CANDIDATES,
  INITIAL_DEMO_JOBS,
  INITIAL_DEMO_ORGS,
  removeDemoResume,
  storeDemoResume,
  getStoredDemoLoginEnabled,
  setStoredDemoLoginEnabled,
} from "./demo-data";

const DEMO_STORAGE_KEY = "kandsys_demo_role";

function getStoredDemoRole(): "owner" | "admin" | null {
  if (typeof window === "undefined") return null;
  try {
    const role = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (role === "owner" || role === "admin") return role;
  } catch {
    // sessionStorage not available
  }
  return null;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export type JobInput = Omit<Job, "id" | "orgId" | "createdAt">;
export type CandidateInput = Omit<
  Candidate,
  "id" | "orgId" | "createdAt" | "createdBy" | "stage" | "links" | "position"
> & {
  stage?: Stage;
  links?: Candidate["links"];
  position?: number;
  /** Staged CV upload; sent to the resumes bucket after the candidate row exists. */
  resumeFile?: File | undefined;
};
export type UserInput = Omit<User, "id"> & {
  password?: string | undefined;
};

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
  updateCandidate: (
    id: string,
    input: Partial<Omit<Candidate, "id">> & {
      resumeFile?: File | undefined;
      resumePath?: string | null | undefined;
    },
  ) => void;
  deleteCandidate: (id: string) => void;
  deleteResume: (candidateId: string) => void;
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
  isDemo: boolean;
  startDemoSession: (role: "owner" | "admin") => void;
  exitDemoSession: () => void;
  demoLoginEnabled: boolean;
  setDemoLoginEnabled: (enabled: boolean) => void;
}

// Keep one context instance across hot reloads so providers and consumers always match.
const g = globalThis as unknown as { __atsContext?: React.Context<AtsState | null> };
const AtsContext = (g.__atsContext ??= createContext<AtsState | null>(null));

export function AtsProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const [demoRole, setDemoRole] = useState<"owner" | "admin" | null>(getStoredDemoRole);
  const [demoOrgs, setDemoOrgs] = useState<Organization[]>(INITIAL_DEMO_ORGS);
  const [demoUsers, setDemoUsers] = useState<User[]>(DEMO_TEAM_MEMBERS);
  const [demoJobs, setDemoJobs] = useState<Job[]>(INITIAL_DEMO_JOBS);
  const [demoCandidates, setDemoCandidates] = useState<Candidate[]>(INITIAL_DEMO_CANDIDATES);
  const [demoLoginEnabled, setDemoLoginEnabledState] = useState<boolean>(getStoredDemoLoginEnabled);

  const setDemoLoginEnabled = useCallback((enabled: boolean) => {
    setDemoLoginEnabledState(enabled);
    setStoredDemoLoginEnabled(enabled);
  }, []);

  const isDemo = Boolean(demoRole);
  const effectiveCurrentUser = useMemo(
    () => (demoRole ? DEMO_USERS[demoRole] : currentUser),
    [demoRole, currentUser],
  );
  const effectiveAuthReady = Boolean(demoRole || authReady);

  const refreshUser = useCallback(async () => {
    if (demoRole) {
      return DEMO_USERS[demoRole];
    }
    const u = await loadUser();
    setCurrentUser(u);
    setAuthReady(true);
    return u;
  }, [demoRole]);

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
        // Keep authReady false on timeout so AuthLoadingScreen can offer a retry button.
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setAuthReady(true);
        return;
      }
      // Defer Supabase queries outside onAuthStateChange to avoid deadlocking navigator.locks.
      setTimeout(() => {
        if (!active) return;
        void loadUser()
          .then((u) => {
            if (active) {
              setCurrentUser(u);
              setAuthReady(true);
            }
          })
          .catch(() => {
            // Handled by AuthLoadingScreen watchdog retry.
          });
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const orgsQuery = useQuery({
    queryKey: ["orgs"],
    enabled: !demoRole && !!currentUser,
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
    enabled: !demoRole && !!currentUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as ProfileRow[]).map(toUser);
    },
  });

  const organizations = useMemo(
    () => (demoRole ? demoOrgs : ((orgsQuery.data ?? []) as Organization[])),
    [demoRole, demoOrgs, orgsQuery.data],
  );
  const users = useMemo(
    () => (demoRole ? demoUsers : ((profilesQuery.data ?? []) as User[])),
    [demoRole, demoUsers, profilesQuery.data],
  );

  const effectiveSelectedOrgId = useMemo(() => {
    if (selectedOrgId && organizations.some((o) => o.id === selectedOrgId)) {
      return selectedOrgId;
    }
    return organizations[0]?.id ?? null;
  }, [selectedOrgId, organizations]);

  const activeOrgId = activeOrgFor(effectiveCurrentUser, effectiveSelectedOrgId);
  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;

  const jobsQuery = useQuery({
    queryKey: ["jobs", activeOrgId],
    enabled: !demoRole && !!currentUser && !!activeOrgId,
    queryFn: () => fetchJobs(activeOrgId!),
  });

  const candidatesQuery = useQuery({
    queryKey: ["candidates", activeOrgId],
    enabled: !demoRole && !!currentUser && !!activeOrgId,
    queryFn: () => fetchCandidates(activeOrgId!),
  });

  const jobs = useMemo(
    () => (demoRole ? demoJobs : (jobsQuery.data ?? [])),
    [demoRole, demoJobs, jobsQuery.data],
  );
  const candidates = useMemo(
    () => (demoRole ? demoCandidates : (candidatesQuery.data ?? [])),
    [demoRole, demoCandidates, candidatesQuery.data],
  );

  const orgJobs = useMemo(
    () => visibleJobs(effectiveCurrentUser, jobs, activeOrgId),
    [effectiveCurrentUser, jobs, activeOrgId],
  );
  const orgCandidates = useMemo(
    () => visibleCandidates(effectiveCurrentUser, candidates, activeOrgId),
    [effectiveCurrentUser, candidates, activeOrgId],
  );

  const createOrgMut = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("orgs").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Organisationen skapades");
      void qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: () => toast.error("Kunde inte skapa organisationen"),
  });

  const updateOrgMut = useMutation({
    mutationFn: async (v: { id: string; name: string }) => {
      const { error } = await supabase.from("orgs").update({ name: v.name }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Namnet uppdaterades");
      void qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: () => toast.error("Kunde inte uppdatera organisationen"),
  });

  const deleteOrgMut = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Ej inloggad");
      return await deleteOrgRpc({
        data: {
          accessToken: session.access_token,
          orgId: id,
        },
      });
    },
    onSuccess: (_data, id) => {
      toast.success("Organisationen togs bort");
      setSelectedOrgId((s) =>
        s === id ? (organizations.find((o) => o.id !== id)?.id ?? null) : s,
      );
      void qc.invalidateQueries({ queryKey: ["orgs"] });
      void qc.invalidateQueries({ queryKey: ["profiles"] });
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      void qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte ta bort organisationen");
    },
  });

  const createUserMut = useMutation({
    mutationFn: async (v: { input: UserInput; newOrgName?: string | undefined }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Ej inloggad");
      if (!v.input.password || v.input.password.length < 8) {
        throw new Error("Lösenordet måste vara minst 8 tecken");
      }
      return await createUserRpc({
        data: {
          accessToken: session.access_token,
          email: v.input.email,
          fullName: v.input.name,
          password: v.input.password,
          role: v.input.role,
          orgRole: v.input.orgRole,
          ...(v.input.orgId ? { orgId: v.input.orgId } : {}),
          ...(v.newOrgName ? { newOrgName: v.newOrgName } : {}),
          ...(v.input.jobIds !== undefined ? { jobIds: v.input.jobIds } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Användaren skapades");
      void qc.invalidateQueries({ queryKey: ["profiles"] });
      void qc.invalidateQueries({ queryKey: ["orgs"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte skapa användaren");
    },
  });

  const updateUserMut = useMutation({
    mutationFn: async (v: { id: string; input: Partial<UserInput> }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Ej inloggad");
      return await updateUserRpc({
        data: {
          accessToken: session.access_token,
          userId: v.id,
          ...(v.input.name !== undefined ? { fullName: v.input.name } : {}),
          ...(v.input.email !== undefined ? { email: v.input.email } : {}),
          ...(v.input.role !== undefined ? { role: v.input.role } : {}),
          ...(v.input.orgRole !== undefined ? { orgRole: v.input.orgRole } : {}),
          ...("orgId" in v.input ? { orgId: v.input.orgId ?? null } : {}),
          ...("jobIds" in v.input ? { jobIds: v.input.jobIds ?? null } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Användaren uppdaterades");
      void qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte uppdatera användaren");
    },
  });

  const deleteUserMut = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Ej inloggad");
      return await deleteUserRpc({
        data: {
          accessToken: session.access_token,
          userId: id,
        },
      });
    },
    onSuccess: () => {
      toast.success("Användaren togs bort");
      void qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Kunde inte ta bort användaren");
    },
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["jobs", activeOrgId] });
      if (currentUser?.jobIds) {
        void refreshUser();
      }
    },
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

      const { data: created, error } = await supabase
        .from("candidates")
        .insert({
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
        })
        .select("id")
        .single();
      if (error) throw error;

      if (input.resumeFile) {
        const path = `${activeOrgId}/${created!.id}/cv.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from("resumes")
          .upload(path, input.resumeFile, { contentType: "application/pdf", upsert: true });
        if (uploadErr) throw uploadErr;
        const { error: pathErr } = await supabase
          .from("candidates")
          .update({ resume_path: path })
          .eq("id", created!.id);
        if (pathErr) throw pathErr;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
    onError: () => toast.error("Kunde inte lägga till kandidaten"),
  });

  const updateCandidateMut = useMutation({
    mutationFn: async (v: {
      id: string;
      input: Partial<Omit<Candidate, "id">> & {
        resumeFile?: File | undefined;
        resumePath?: string | null | undefined;
      };
    }) => {
      const patch: Partial<CandidateRow> = {};

      if (v.input.resumeFile) {
        const orgId = candidates.find((c) => c.id === v.id)?.orgId ?? activeOrgId;
        if (!orgId) throw new Error("Ingen aktiv organisation");
        const path = `${orgId}/${v.id}/cv.pdf`;
        const { error: uploadErr } = await supabase.storage
          .from("resumes")
          .upload(path, v.input.resumeFile, { contentType: "application/pdf", upsert: true });
        if (uploadErr) throw uploadErr;
        patch.resume_path = path;
      } else if (v.input.resumePath === null) {
        const existingPath = candidates.find((c) => c.id === v.id)?.resumePath;
        if (existingPath) {
          const { error: removeErr } = await supabase.storage
            .from("resumes")
            .remove([existingPath]);
          if (removeErr) throw removeErr;
        }
        patch.resume_path = null;
      }

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
      const resumePath = candidates.find((c) => c.id === id)?.resumePath;
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
      if (resumePath) {
        // Best effort: on failure the file is orphaned but unreachable, since
        // no row keeps the path and RLS still guards the org folder.
        await supabase.storage.from("resumes").remove([resumePath]);
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] }),
    onError: () => toast.error("Kunde inte radera kandidaten"),
  });

  const deleteResumeMut = useMutation({
    mutationFn: async (id: string) => {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate?.resumePath) return;
      const { error: removeErr } = await supabase.storage
        .from("resumes")
        .remove([candidate.resumePath]);
      if (removeErr) throw removeErr;
      const { error } = await supabase
        .from("candidates")
        .update({ resume_path: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("CV:t togs bort");
      void qc.invalidateQueries({ queryKey: ["candidates", activeOrgId] });
    },
    onError: () => toast.error("Kunde inte ta bort CV:t"),
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

  const startDemoSession = useCallback((role: "owner" | "admin") => {
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, role);
    } catch {
      // sessionStorage blocked
    }
    setDemoRole(role);
    setDemoOrgs(INITIAL_DEMO_ORGS);
    setDemoUsers(DEMO_TEAM_MEMBERS);
    setDemoJobs(INITIAL_DEMO_JOBS);
    setDemoCandidates(INITIAL_DEMO_CANDIDATES);
    setSelectedOrgId(role === "admin" ? DEMO_NORDVIK_ID : null);
  }, []);

  const exitDemoSession = useCallback(async () => {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // sessionStorage blocked
    }
    setDemoRole(null);
    setDemoOrgs(INITIAL_DEMO_ORGS);
    setDemoUsers(DEMO_TEAM_MEMBERS);
    setDemoJobs(INITIAL_DEMO_JOBS);
    setDemoCandidates(INITIAL_DEMO_CANDIDATES);
    setSelectedOrgId(null);
    void refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    if (demoRole) {
      try {
        sessionStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // sessionStorage blocked
      }
      setDemoRole(null);
      setDemoOrgs(INITIAL_DEMO_ORGS);
      setDemoUsers(DEMO_TEAM_MEMBERS);
      setDemoJobs(INITIAL_DEMO_JOBS);
      setDemoCandidates(INITIAL_DEMO_CANDIDATES);
      return;
    }
    await signOut();
    setCurrentUser(null);
    qc.clear();
  }, [demoRole, qc]);

  const value = useMemo<AtsState>(
    () => ({
      users,
      organizations,
      jobs,
      candidates,
      currentUser: effectiveCurrentUser,
      authReady: effectiveAuthReady,
      selectedOrgId: effectiveSelectedOrgId,
      activeOrgId,
      activeOrg,
      orgJobs,
      orgCandidates,
      refreshUser,
      logout,
      selectOrg: setSelectedOrgId,
      isDemo,
      startDemoSession,
      exitDemoSession,
      demoLoginEnabled,
      setDemoLoginEnabled,
      createJob: (input) => {
        if (!activeOrgId) return;
        if (demoRole) {
          const newJob: Job = {
            id: uid("job"),
            orgId: activeOrgId,
            title: input.title,
            location: input.location,
            description: input.description,
            status: input.status,
            createdAt: new Date().toISOString().slice(0, 10),
          };
          setDemoJobs((prev) => [newJob, ...prev]);
          toast.success("Tjänsten skapades");
          return;
        }
        createJobMut.mutate(input);
      },
      updateJob: (id, input) => {
        if (demoRole) {
          setDemoJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...input } : j)));
          toast.success("Tjänsten uppdaterades");
          return;
        }
        updateJobMut.mutate({ id, input });
      },
      createCandidate: (input) => {
        if (!activeOrgId) return;
        if (demoRole) {
          const resumePath = input.resumeFile ? storeDemoResume(input.resumeFile) : null;
          const inNew = demoCandidates
            .filter(
              (x) =>
                x.orgId === activeOrgId &&
                (!input.jobId || x.jobId === input.jobId) &&
                x.stage === "new",
            )
            .sort((a, b) => a.position - b.position);
          const lastPos = inNew[inNew.length - 1]?.position;
          const newC: Candidate = {
            id: uid("c"),
            orgId: activeOrgId,
            jobId: input.jobId ?? null,
            name: input.name,
            email: input.email ?? "",
            phone: input.phone ?? "",
            linkedin: input.linkedin ?? "",
            links: input.links ?? [],
            note: input.note ?? "",
            interviewAt: input.interviewAt ? input.interviewAt.slice(0, 16) : undefined,
            interviewLink: input.interviewLink || undefined,
            stage: input.stage ?? "new",
            position: positionBetween(lastPos, undefined),
            resumePath,
            createdBy: effectiveCurrentUser?.id ?? "u-demo-owner",
            createdAt: new Date().toISOString().slice(0, 10),
          };
          setDemoCandidates((prev) => [...prev, newC]);
          toast.success("Kandidaten lades till");
          return;
        }
        createCandidateMut.mutate(input);
      },
      updateCandidate: (id, input) => {
        if (demoRole) {
          setDemoCandidates((prev) =>
            prev.map((c) => {
              if (c.id !== id) return c;
              let resumePath = c.resumePath;
              if (input.resumeFile) {
                resumePath = storeDemoResume(input.resumeFile);
              } else if (input.resumePath === null) {
                if (c.resumePath?.startsWith("demo:")) removeDemoResume(c.resumePath);
                resumePath = null;
              }
              return {
                ...c,
                ...input,
                resumePath,
                interviewAt:
                  input.interviewAt !== undefined
                    ? input.interviewAt
                      ? input.interviewAt.slice(0, 16)
                      : undefined
                    : c.interviewAt,
                interviewLink:
                  input.interviewLink !== undefined
                    ? input.interviewLink || undefined
                    : c.interviewLink,
              };
            }),
          );
          toast.success("Kandidaten sparades");
          return;
        }
        updateCandidateMut.mutate({ id, input });
      },
      deleteCandidate: (id) => {
        if (demoRole) {
          setDemoCandidates((prev) => {
            const target = prev.find((c) => c.id === id);
            if (target?.resumePath?.startsWith("demo:")) removeDemoResume(target.resumePath);
            return prev.filter((c) => c.id !== id);
          });
          toast.success("Kandidaten raderades");
          return;
        }
        deleteCandidateMut.mutate(id);
      },
      deleteResume: (id) => {
        if (demoRole) {
          setDemoCandidates((prev) =>
            prev.map((c) => {
              if (c.id !== id) return c;
              if (c.resumePath?.startsWith("demo:")) removeDemoResume(c.resumePath);
              return { ...c, resumePath: null };
            }),
          );
          toast.success("CV:t togs bort");
          return;
        }
        deleteResumeMut.mutate(id);
      },
      moveCandidate: (id, stage, beforeId) => {
        if (demoRole) {
          const planned = planMoveCandidate(demoCandidates, id, stage, beforeId);
          if (!planned) return;
          setDemoCandidates((prev) => {
            if (planned.renumbered) {
              const map = new Map(planned.renumbered.map((r) => [r.id, r]));
              return prev
                .map((c) => {
                  const r = map.get(c.id);
                  return r ? { ...c, stage: r.stage, position: r.position } : c;
                })
                .sort((a, b) => a.position - b.position);
            }
            return prev
              .map((c) =>
                c.id === planned.id
                  ? { ...c, stage: planned.stage, position: planned.position }
                  : c,
              )
              .sort((a, b) => a.position - b.position);
          });
          return;
        }
        const planned = planMoveCandidate(candidates, id, stage, beforeId);
        if (!planned) return;
        moveCandidateMut.mutate(planned);
      },
      assignCandidate: (id, jobId) => {
        if (demoRole) {
          setDemoCandidates((prev) => {
            const c = prev.find((x) => x.id === id);
            if (!c || c.jobId === jobId) return prev;
            const inNew = prev
              .filter((x) => x.orgId === c.orgId && x.id !== id && x.stage === "new")
              .sort((a, b) => a.position - b.position);
            const lastPos = inNew[inNew.length - 1]?.position;
            return prev.map((x) =>
              x.id === id
                ? { ...x, jobId, stage: "new", position: positionBetween(lastPos, undefined) }
                : x,
            );
          });
          return;
        }
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
        if (demoRole) {
          setDemoCandidates((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, links: [...c.links, { id: uid("l"), label, url }] } : c,
            ),
          );
          return;
        }
        const c = candidates.find((x) => x.id === id);
        if (!c) return;
        updateCandidateMut.mutate({
          id,
          input: { links: [...c.links, { id: uid("l"), label, url }] },
        });
      },
      removeLink: (id, linkId) => {
        if (demoRole) {
          setDemoCandidates((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, links: c.links.filter((l) => l.id !== linkId) } : c,
            ),
          );
          return;
        }
        const c = candidates.find((x) => x.id === id);
        if (!c) return;
        updateCandidateMut.mutate({
          id,
          input: { links: c.links.filter((l) => l.id !== linkId) },
        });
      },
      updateUser: (id, input) => {
        if (demoRole) {
          setDemoUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...input } : u)));
          toast.success("Användaren uppdaterades");
          return;
        }
        updateUserMut.mutate({ id, input });
      },
      deleteUser: (id) => {
        if (demoRole) {
          setDemoUsers((prev) => prev.filter((u) => u.id !== id));
          toast.success("Användaren raderades");
          return;
        }
        deleteUserMut.mutate(id);
      },
      createOrg: (name) => {
        if (demoRole) {
          const newOrg: Organization = {
            id: uid("org"),
            name,
          };
          setDemoOrgs((prev) => [...prev, newOrg]);
          toast.success("Organisationen skapades");
          return;
        }
        createOrgMut.mutate(name);
      },
      updateOrg: (id, name) => {
        if (demoRole) {
          setDemoOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, name } : o)));
          toast.success("Namnet uppdaterades");
          return;
        }
        updateOrgMut.mutate({ id, name });
      },
      deleteOrg: (id) => {
        if (demoRole) {
          setDemoOrgs((prev) => prev.filter((o) => o.id !== id));
          toast.success("Organisationen raderades");
          return;
        }
        deleteOrgMut.mutate(id);
      },
      can: (perm) => canDo(effectiveCurrentUser, perm),
      createUser: (input, newOrgName) => {
        if (demoRole) {
          let orgId = input.orgId;
          if (newOrgName) {
            const newOrg: Organization = {
              id: uid("org"),
              name: newOrgName,
            };
            setDemoOrgs((prev) => [...prev, newOrg]);
            orgId = newOrg.id;
          }
          const newUser: User = {
            id: uid("u"),
            name: input.name,
            email: input.email,
            role: input.role,
            orgRole: input.orgRole,
            orgId,
          };
          setDemoUsers((prev) => [...prev, newUser]);
          toast.success("Användaren skapades");
          return;
        }
        createUserMut.mutate({ input, newOrgName });
      },
    }),
    [
      users,
      organizations,
      jobs,
      candidates,
      effectiveCurrentUser,
      effectiveAuthReady,
      effectiveSelectedOrgId,
      activeOrgId,
      activeOrg,
      orgJobs,
      orgCandidates,
      refreshUser,
      logout,
      isDemo,
      startDemoSession,
      exitDemoSession,
      demoLoginEnabled,
      setDemoLoginEnabled,
      demoRole,
      demoCandidates,
      createJobMut,
      updateJobMut,
      createCandidateMut,
      updateCandidateMut,
      deleteCandidateMut,
      deleteResumeMut,
      moveCandidateMut,
      createOrgMut,
      updateOrgMut,
      deleteOrgMut,
      createUserMut,
      updateUserMut,
      deleteUserMut,
    ],
  );

  return <AtsContext.Provider value={value}>{children}</AtsContext.Provider>;
}

export function useAts() {
  const ctx = useContext(AtsContext);
  if (!ctx) throw new Error("useAts must be used inside AtsProvider");
  return ctx;
}
