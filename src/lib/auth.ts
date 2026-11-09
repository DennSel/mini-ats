import { supabase } from "./supabase";
import type { OrgRole, Role, User } from "./mock-data";

interface ProfileRow {
  id: string;
  role: Role;
  org_role: OrgRole;
  org_id: string | null;
  full_name: string;
  email: string;
}

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export async function loadUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single<ProfileRow>();
  if (!p) return null;
  return {
    id: p.id,
    name: p.full_name,
    email: p.email,
    role: p.role,
    orgRole: p.org_role,
    orgId: p.org_id,
  };
}
