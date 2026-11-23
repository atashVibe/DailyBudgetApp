import test from "node:test";
import assert from "node:assert/strict";
import {
  emailActionReturn,
  emailActionSettings,
  EMAIL_ACTION_URL,
  invitationLink,
} from "../services/appLinks.ts";

test("email actions preserve only known app/invitation destinations", () => {
  assert.equal(
    EMAIL_ACTION_URL,
    "https://atashvibe.github.io/DailyBudgetApp/auth-action",
  );
  assert.deepEqual(emailActionReturn(invitationLink("00123456")), {
    pathname: "/join-invitation",
    params: { code: "00123456" },
  });
  assert.deepEqual(
    emailActionReturn(
      "https://atashvibe.github.io/DailyBudgetApp/login?inviteCode=00123456",
    ),
    { pathname: "/login", params: { inviteCode: "00123456" } },
  );
  assert.deepEqual(emailActionSettings("00123456"), {
    url: invitationLink("00123456"),
  });
  assert.deepEqual(emailActionSettings(), {
    url: "https://atashvibe.github.io/DailyBudgetApp/login",
  });
});
test("email action return URLs cannot redirect to other sites, routes or injected invitation parameters", () => {
  for (const value of [
    undefined,
    [invitationLink("00123456")],
    "javascript:alert(1)",
    "//evil.test",
    "https://atashvibe.github.io.evil.test/DailyBudgetApp/login",
    "https://attacker@atashvibe.github.io/DailyBudgetApp/login",
    "https://atashvibe.github.io/another-app/login",
    "https://atashvibe.github.io/DailyBudgetApp/join-invitation?code=12345678%26next%3Devil",
    "https://atashvibe.github.io/DailyBudgetApp/admin",
    "https://evil.test/" + "x".repeat(4100),
  ])
    assert.deepEqual(emailActionReturn(value), { pathname: "/" });
});
