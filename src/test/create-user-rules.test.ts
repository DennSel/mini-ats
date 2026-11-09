import { describe, expect, it } from "vitest";
import { decideCreateUser, type Caller } from "@/lib/create-user-rules";

const adminCaller: Caller = { role: "admin", orgRole: "owner", orgId: null };
const ownerCaller: Caller = { role: "customer", orgRole: "owner", orgId: "org-nordvik" };
const memberCaller: Caller = { role: "customer", orgRole: "member", orgId: "org-nordvik" };
const viewerCaller: Caller = { role: "customer", orgRole: "viewer", orgId: "org-nordvik" };

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
