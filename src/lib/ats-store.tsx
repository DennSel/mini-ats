import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  seedCandidates,
  seedJobs,
  seedOrganizations,
  seedUsers,
  type Candidate,
  type Job,
  type Organization,
  type Stage,
  type User,
} from "./mock-data";
import { activeOrgFor, visibleCandidates, visibleJobs, assignCandidate, can as canDo, moveCandidate, type Permission } from "./ats-logic";

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const today = () => new Date().toISOString().slice(0, 10);

export type JobInput = Omit<Job, "id" | "orgId" | "createdAt">;
export type CandidateInput = Omit<Candidate, "id" | "orgId" | "createdAt" | "stage" | "links"> & {
  stage?: Stage;
  links?: Candidate["links"];
};
export type UserInput = Omit<User, "id" | "password"> & { password?: string };

interface AtsState {
  users: User[];
  organizations: Organization[];
  jobs: Job[];
  candidates: Candidate[];
  currentUser: User | null;
  selectedOrgId: string | null;
  activeOrgId: string | null;
  activeOrg: Organization | null;
  /** Jobs/candidates of the active org that the current user may see */
  orgJobs: Job[];
  orgCandidates: Candidate[];
  login: (email: string, password: string) => User | null;
  logout: () => void;
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
  updateUser: (id: string, input: Partial<Omit<User, "id" | "password">>) => void;
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
  const [users, setUsers] = useState(seedUsers);
  const [organizations, setOrganizations] = useState(seedOrganizations);
  const [jobs, setJobs] = useState(seedJobs);
  const [candidates, setCandidates] = useState(seedCandidates);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(seedOrganizations[0]?.id ?? null);

  const currentUser = users.find((u) => u.id === currentUserId) ?? null;
  const activeOrgId = activeOrgFor(currentUser, selectedOrgId);
  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;
  const orgJobs = useMemo(() => visibleJobs(currentUser, jobs, activeOrgId), [currentUser, jobs, activeOrgId]);
  const orgCandidates = useMemo(
    () => visibleCandidates(currentUser, candidates, activeOrgId),
    [currentUser, candidates, activeOrgId],
  );

  const login = useCallback(
    (email: string, password: string) => {
      const u = users.find(
        (x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password,
      );
      if (u) setCurrentUserId(u.id);
      return u ?? null;
    },
    [users],
  );

  const value = useMemo<AtsState>(
    () => ({
      users,
      organizations,
      jobs,
      candidates,
      currentUser,
      selectedOrgId,
      activeOrgId,
      activeOrg,
      orgJobs,
      orgCandidates,
      login,
      logout: () => setCurrentUserId(null),
      selectOrg: setSelectedOrgId,
      createJob: (input) => {
        if (!activeOrgId) return;
        setJobs((j) => [{ ...input, id: uid("job"), orgId: activeOrgId, createdAt: today() }, ...j]);
      },
      updateJob: (id, input) => setJobs((j) => j.map((x) => (x.id === id ? { ...x, ...input } : x))),
      createCandidate: (input) => {
        if (!activeOrgId) return;
        setCandidates((c) => [
          ...c,
          { stage: "new", links: [], ...input, id: uid("cand"), orgId: activeOrgId, createdAt: today() },
        ]);
      },
      updateCandidate: (id, input) =>
        setCandidates((c) => c.map((x) => (x.id === id ? { ...x, ...input } : x))),
      deleteCandidate: (id) => setCandidates((c) => c.filter((x) => x.id !== id)),
      moveCandidate: (id, stage, beforeId) =>
        setCandidates((c) => moveCandidate(c, id, stage, beforeId)),
      assignCandidate: (id, jobId) => setCandidates((c) => assignCandidate(c, id, jobId)),
      addLink: (id, label, url) =>
        setCandidates((c) =>
          c.map((x) => (x.id === id ? { ...x, links: [...x.links, { id: uid("l"), label, url }] } : x)),
        ),
      removeLink: (id, linkId) =>
        setCandidates((c) =>
          c.map((x) => (x.id === id ? { ...x, links: x.links.filter((l) => l.id !== linkId) } : x)),
        ),
      updateUser: (id, input) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...input } : x))),
      deleteUser: (id) => setUsers((u) => u.filter((x) => x.id !== id)),
      createOrg: (name) => setOrganizations((o) => [...o, { id: uid("org"), name }]),
      updateOrg: (id, name) => setOrganizations((o) => o.map((x) => (x.id === id ? { ...x, name } : x))),
      deleteOrg: (id) => {
        setOrganizations((o) => o.filter((x) => x.id !== id));
        setJobs((j) => j.filter((x) => x.orgId !== id));
        setCandidates((c) => c.filter((x) => x.orgId !== id));
        setSelectedOrgId((s) => (s === id ? (organizations.find((o) => o.id !== id)?.id ?? null) : s));
      },
      can: (perm) => canDo(currentUser, perm),
      createUser: (input, newOrgName) => {
        let orgId = input.orgId;
        if (newOrgName) {
          orgId = uid("org");
          setOrganizations((o) => [...o, { id: orgId!, name: newOrgName }]);
        }
        setUsers((u) => [
          ...u,
          { ...input, orgId, id: uid("u"), password: input.password ?? "kund123" },
        ]);
      },
    }),
    [users, organizations, jobs, candidates, currentUser, selectedOrgId, activeOrgId, activeOrg, orgJobs, orgCandidates, login],
  );

  return <AtsContext.Provider value={value}>{children}</AtsContext.Provider>;
}

export function useAts() {
  const ctx = useContext(AtsContext);
  if (!ctx) throw new Error("useAts must be used inside AtsProvider");
  return ctx;
}
