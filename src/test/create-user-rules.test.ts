import { describe, expect, it } from "vitest";
import {
  decideCreateUser,
  decideDeleteUser,
  decideUpdateUser,
  type Caller,
  type TargetUser,
} from "@/lib/create-user-rules";

const adminCaller: Caller & { id: string } = {
  id: "u-admin",
  role: "admin",
  orgRole: "owner",
  orgId: null,
};
const ownerCaller: Caller & { id: string } = {
  id: "u-owner-a",
  role: "customer",
  orgRole: "owner",
  orgId: "org-nordvik",
};
const memberCaller: Caller & { id: string } = {
  id: "u-member-a",
  role: "customer",
  orgRole: "member",
  orgId: "org-nordvik",
};
const viewerCaller: Caller & { id: string } = {
  id: "u-viewer-a",
  role: "customer",
  orgRole: "viewer",
  orgId: "org-nordvik",
};

const targetOwnerA: TargetUser = {
  id: "u-owner-a",
  fullName: "Anna Lindqvist",
  email: "anna@nordvik.se",
  role: "customer",
  orgRole: "owner",
  orgId: "org-nordvik",
};

const targetOtherOwnerA: TargetUser = {
  id: "u-owner-a2",
  fullName: "Olof Ägare",
  email: "olof@nordvik.se",
  role: "customer",
  orgRole: "owner",
  orgId: "org-nordvik",
};

const targetMemberA: TargetUser = {
  id: "u-member-a",
  fullName: "Lars Ek",
  email: "lars@nordvik.se",
  role: "customer",
  orgRole: "member",
  orgId: "org-nordvik",
};

const targetMemberB: TargetUser = {
  id: "u-member-b",
  fullName: "Erik Holm",
  email: "erik@solberg.se",
  role: "customer",
  orgRole: "owner",
  orgId: "org-solberg",
};

describe("decideCreateUser", () => {
  it("owner sending role admin still gets customer in their own org", () => {
    const res = decideCreateUser(ownerCaller, {
      role: "admin",
      orgRole: "member",
      orgId: "org-nordvik",
    });
    expect(res).toEqual({
      ok: true,
      role: "customer",
      orgRole: "member",
      orgId: "org-nordvik",
    });
  });

  it("owner sending another orgId still gets their own orgId", () => {
    const res = decideCreateUser(ownerCaller, {
      role: "customer",
      orgRole: "viewer",
      orgId: "org-solberg",
    });
    expect(res).toEqual({
      ok: true,
      role: "customer",
      orgRole: "viewer",
      orgId: "org-nordvik",
    });
  });

  it("member, viewer, and unauthenticated callers are denied", () => {
    expect(
      decideCreateUser(memberCaller, { role: "customer", orgRole: "viewer", orgId: "org-nordvik" }),
    ).toEqual({ ok: false, reason: "Saknar behörighet" });
    expect(
      decideCreateUser(viewerCaller, { role: "customer", orgRole: "viewer", orgId: "org-nordvik" }),
    ).toEqual({ ok: false, reason: "Saknar behörighet" });
    expect(
      decideCreateUser(null, { role: "customer", orgRole: "viewer", orgId: "org-nordvik" }),
    ).toEqual({ ok: false, reason: "Ej inloggad" });
  });

  it("admin creating customer without orgId and without newOrgName is denied", () => {
    const res = decideCreateUser(adminCaller, {
      role: "customer",
      orgRole: "owner",
    });
    expect(res).toEqual({ ok: false, reason: "Organisation saknas" });
  });

  it("admin creating customer with newOrgName is approved and forwards newOrgName", () => {
    const res = decideCreateUser(adminCaller, {
      role: "customer",
      orgRole: "owner",
      newOrgName: "Ny Kund AB",
    });
    expect(res).toEqual({
      ok: true,
      role: "customer",
      orgRole: "owner",
      orgId: null,
      newOrgName: "Ny Kund AB",
    });
  });

  it("admin creating admin gets orgId null", () => {
    const res = decideCreateUser(adminCaller, {
      role: "admin",
      orgRole: "member",
      orgId: "org-nordvik",
    });
    expect(res).toEqual({
      ok: true,
      role: "admin",
      orgRole: "owner",
      orgId: null,
    });
  });
});

describe("decideCreateUser job access (slice 16)", () => {
  it("admins and owners are never created with restricted jobIds", () => {
    expect(
      decideCreateUser(adminCaller, { role: "admin", orgRole: "owner", jobIds: ["job-1"] }),
    ).toEqual({
      ok: true,
      role: "admin",
      orgRole: "owner",
      orgId: null,
      jobIds: null,
    });
    expect(
      decideCreateUser(ownerCaller, { role: "customer", orgRole: "owner", jobIds: ["job-1"] }),
    ).toEqual({
      ok: true,
      role: "customer",
      orgRole: "owner",
      orgId: "org-nordvik",
      jobIds: null,
    });
    expect(
      decideCreateUser(adminCaller, {
        role: "customer",
        orgRole: "owner",
        orgId: "org-nordvik",
        jobIds: ["job-1"],
      }),
    ).toEqual({
      ok: true,
      role: "customer",
      orgRole: "owner",
      orgId: "org-nordvik",
      jobIds: null,
    });
  });

  it("customer members and viewers are created with the requested jobIds", () => {
    expect(
      decideCreateUser(ownerCaller, {
        role: "customer",
        orgRole: "member",
        jobIds: ["job-1", "job-2"],
      }),
    ).toEqual({
      ok: true,
      role: "customer",
      orgRole: "member",
      orgId: "org-nordvik",
      jobIds: ["job-1", "job-2"],
    });
    expect(
      decideCreateUser(adminCaller, {
        role: "customer",
        orgRole: "viewer",
        orgId: "org-nordvik",
        jobIds: ["job-1"],
      }),
    ).toEqual({
      ok: true,
      role: "customer",
      orgRole: "viewer",
      orgId: "org-nordvik",
      jobIds: ["job-1"],
    });
  });

  it("decisions without jobIds in the input carry no jobIds key", () => {
    const res = decideCreateUser(ownerCaller, { role: "customer", orgRole: "viewer" });
    expect(res).toEqual({ ok: true, role: "customer", orgRole: "viewer", orgId: "org-nordvik" });
    expect("jobIds" in res).toBe(false);
  });
});

describe("decideUpdateUser (slices 13 & 14)", () => {
  it("owner can change a colleague's role inside their own organisation", () => {
    const res = decideUpdateUser(ownerCaller, targetMemberA, { orgRole: "viewer" }, 1);
    expect(res).toEqual({
      ok: true,
      fullName: "Lars Ek",
      email: "lars@nordvik.se",
      role: "customer",
      orgRole: "viewer",
      orgId: "org-nordvik",
    });
  });

  it("owner cannot demote the last owner of the organisation", () => {
    expect(decideUpdateUser(ownerCaller, targetOwnerA, { orgRole: "member" }, 1)).toEqual({
      ok: false,
      reason: "Organisationen måste ha minst en ägare",
    });
    expect(decideUpdateUser(ownerCaller, targetOwnerA, { orgRole: "member" }, 2)).toMatchObject({
      ok: true,
      orgRole: "member",
    });
  });

  it("owner cannot modify users in another organisation or edit admin-only fields", () => {
    expect(decideUpdateUser(ownerCaller, targetMemberB, { orgRole: "viewer" }, 2)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
    expect(decideUpdateUser(ownerCaller, targetMemberA, { fullName: "Nytt Namn" }, 1)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
    expect(decideUpdateUser(ownerCaller, targetMemberA, { role: "admin" }, 1)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
    expect(decideUpdateUser(memberCaller, targetMemberA, { orgRole: "viewer" }, 1)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
  });

  it("admin can edit name, email, role, orgRole and orgId, but still protects the last owner", () => {
    expect(
      decideUpdateUser(
        adminCaller,
        targetMemberA,
        { fullName: "Lars E.", email: "lars.e@nordvik.se", orgRole: "owner", orgId: "org-solberg" },
        1,
      ),
    ).toEqual({
      ok: true,
      fullName: "Lars E.",
      email: "lars.e@nordvik.se",
      role: "customer",
      orgRole: "owner",
      orgId: "org-solberg",
      jobIds: null,
    });

    expect(decideUpdateUser(adminCaller, targetOwnerA, { orgId: "org-solberg" }, 1)).toEqual({
      ok: false,
      reason: "Organisationen måste ha minst en ägare",
    });
  });
});

describe("decideUpdateUser job access (slice 16)", () => {
  const restrictedMember: TargetUser = {
    ...targetMemberA,
    jobIds: ["job-1", "job-2"],
  };

  it("owner can restrict a member to specific jobs and widen back to all", () => {
    expect(decideUpdateUser(ownerCaller, restrictedMember, { jobIds: ["job-1"] }, 1)).toEqual({
      ok: true,
      fullName: "Lars Ek",
      email: "lars@nordvik.se",
      role: "customer",
      orgRole: "member",
      orgId: "org-nordvik",
      jobIds: ["job-1"],
    });
    expect(decideUpdateUser(ownerCaller, restrictedMember, { jobIds: null }, 1)).toMatchObject({
      ok: true,
      jobIds: null,
    });
  });

  it("jobIds survive unrelated updates and are cleared on promotion to owner", () => {
    expect(decideUpdateUser(ownerCaller, restrictedMember, { orgRole: "viewer" }, 1)).toEqual({
      ok: true,
      fullName: "Lars Ek",
      email: "lars@nordvik.se",
      role: "customer",
      orgRole: "viewer",
      orgId: "org-nordvik",
      jobIds: ["job-1", "job-2"],
    });
    expect(
      decideUpdateUser(ownerCaller, restrictedMember, { orgRole: "owner", jobIds: ["job-1"] }, 1),
    ).toMatchObject({ ok: true, orgRole: "owner", jobIds: null });
  });

  it("admin moving a member to another org resets jobIds", () => {
    expect(decideUpdateUser(adminCaller, restrictedMember, { orgId: "org-solberg" }, 1)).toEqual({
      ok: true,
      fullName: "Lars Ek",
      email: "lars@nordvik.se",
      role: "customer",
      orgRole: "member",
      orgId: "org-solberg",
      jobIds: null,
    });
  });
});

describe("decideDeleteUser (slices 13 & 14)", () => {
  it("owner can remove a member in their own organisation, but never in another org", () => {
    expect(decideDeleteUser(ownerCaller, targetMemberA, 1)).toEqual({ ok: true });
    expect(decideDeleteUser(ownerCaller, targetMemberB, 2)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
    expect(decideDeleteUser(memberCaller, targetMemberA, 1)).toEqual({
      ok: false,
      reason: "Saknar behörighet",
    });
  });

  it("nobody can delete themselves, and customer owners cannot delete the last owner of an org", () => {
    expect(decideDeleteUser(ownerCaller, targetOwnerA, 2)).toEqual({
      ok: false,
      reason: "Du kan inte ta bort dig själv",
    });
    expect(
      decideDeleteUser(
        adminCaller,
        { id: "u-admin", role: "admin", orgRole: "owner", orgId: null },
        1,
      ),
    ).toEqual({
      ok: false,
      reason: "Du kan inte ta bort dig själv",
    });
    expect(decideDeleteUser(ownerCaller, targetOtherOwnerA, 1)).toEqual({
      ok: false,
      reason: "Organisationen måste ha minst en ägare",
    });
    expect(decideDeleteUser(ownerCaller, targetOtherOwnerA, 2)).toEqual({ ok: true });
    // Admin can delete the last user/owner of an organisation (leaving it empty)
    expect(decideDeleteUser(adminCaller, targetOwnerA, 1)).toEqual({ ok: true });
    expect(decideDeleteUser(adminCaller, targetOwnerA, 2)).toEqual({ ok: true });
  });
});
