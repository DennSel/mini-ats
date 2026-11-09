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
    });

    expect(decideUpdateUser(adminCaller, targetOwnerA, { orgId: "org-solberg" }, 1)).toEqual({
      ok: false,
      reason: "Organisationen måste ha minst en ägare",
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

  it("nobody can delete themselves or the last owner of an organisation", () => {
    expect(decideDeleteUser(ownerCaller, targetOwnerA, 2)).toEqual({
      ok: false,
      reason: "Du kan inte ta bort dig själv",
    });
    expect(decideDeleteUser(adminCaller, targetOwnerA, 1)).toEqual({
      ok: false,
      reason: "Organisationen måste ha minst en ägare",
    });
    expect(decideDeleteUser(adminCaller, targetOwnerA, 2)).toEqual({ ok: true });
  });
});
