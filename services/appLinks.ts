export const APP_WEB_URL = "https://atashvibe.github.io/DailyBudgetApp";
export const EMAIL_ACTION_URL = `${APP_WEB_URL}/auth-action`;
export const validInvitationCode = (code: unknown): code is string =>
  typeof code === "string" && /^\d{8}$/.test(code);
export const invitationLink = (code: string) =>
  `${APP_WEB_URL}/join-invitation?code=${encodeURIComponent(code)}`;
export const emailActionSettings = (inviteCode?: string) => ({
  url: validInvitationCode(inviteCode)
    ? invitationLink(inviteCode)
    : `${APP_WEB_URL}/login`,
});

export type EmailActionReturn =
  | { pathname: "/" }
  | { pathname: "/login"; params?: { inviteCode: string } }
  | { pathname: "/join-invitation"; params: { code: string } };

// Never navigate to an arbitrary continueUrl supplied in an email/action URL.
// Recover only known app destinations and the eight-digit invitation context.
export function emailActionReturn(value: unknown): EmailActionReturn {
  if (typeof value !== "string" || value.length > 4096)
    return { pathname: "/" };
  try {
    const url = new URL(value);
    if (
      url.origin !== "https://atashvibe.github.io" ||
      url.username ||
      url.password
    )
      return { pathname: "/" };
    const path = url.pathname.replace(/\.html$/, "").replace(/\/$/, "");
    if (path === "/DailyBudgetApp/join-invitation") {
      const code = url.searchParams.get("code");
      return validInvitationCode(code)
        ? { pathname: "/join-invitation", params: { code } }
        : { pathname: "/" };
    }
    if (path === "/DailyBudgetApp/login") {
      const code = url.searchParams.get("inviteCode");
      return validInvitationCode(code)
        ? { pathname: "/login", params: { inviteCode: code } }
        : { pathname: "/login" };
    }
  } catch {
    /* Malformed/untrusted destinations stay inside the app. */
  }
  return { pathname: "/" };
}
