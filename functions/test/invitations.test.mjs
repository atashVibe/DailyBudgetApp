import test from "node:test";
import assert from "node:assert/strict";
import {
  invitationEmail,
  invitationLink,
  createInvitationService,
} from "../src/invitations.mjs";

test("invitation messages contain the code, fixed HTTPS join link, recipient and exact expiry", () => {
  const expiry = Date.UTC(2026, 10, 22, 20);
  const message = invitationEmail(
    "family@example.test",
    "Budget Family",
    "admin",
    "00123456",
    expiry,
  );
  assert.equal(message.to, "family@example.test");
  assert.match(message.text, /00123456/);
  assert.match(
    message.text,
    /https:\/\/atashvibe.github.io\/DailyBudgetApp\/join-invitation\?code=00123456/,
  );
  assert.match(message.text, /2026-11-22T20:00:00.000Z/);
  assert.match(message.text, /an administrator/);
  assert.match(message.text, /Opening the link does not join automatically/);
  assert.ok(!message.html && !message.attachments);
});
test("code validation cannot add another URL or header; family names cannot change the subject", () => {
  for (const code of [
    "123",
    "12345678&next=https://evil.test",
    "1234567\n",
    undefined,
  ])
    assert.throws(() => invitationLink(code));
  const message = invitationEmail(
    "family@example.test",
    "Family\r\nBcc: evil@example.test",
    "member",
    "12345678",
    Date.now(),
  );
  assert.equal(message.subject, "You're invited to DailyBudget");
  assert.ok(!message.text.includes("\r"));
});
test("missing mail configuration does not create an invitation or send anything", async () => {
  const service = createInvitationService({ db: {}, auth: {} });
  await assert.rejects(
    service.create("user", {}),
    (error) => error.status === 503 && error.code === "email-not-configured",
  );
});
