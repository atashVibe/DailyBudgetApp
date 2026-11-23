import * as Crypto from "expo-crypto";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./auth";
import { getFamilyContext, type FamilyRole } from "./families";
import { withTimeout } from "./loading";
import { invitationLink } from "./appLinks";
export { validInvitationCode, invitationLink } from "./appLinks";

export type InvitationResult = {
  status:
    | "accepted"
    | "sending"
    | "unknown"
    | "failed"
    | "manual"
    | "expired"
    | "used";
  code: string | null;
  joinUrl: string | null;
  email?: string;
  expiresAt?: number;
  failure?: string;
};
export const validInvitationEmail = (value: string) =>
  value.trim().length <= 254 &&
  /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value.trim());

export async function sendFamilyInvitation(
  email: string,
  role: FamilyRole,
  requestId: string,
): Promise<InvitationResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const emulated =
    __DEV__ && process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === "1";
  const endpoint =
    process.env.EXPO_PUBLIC_INVITATIONS_API_URL ||
    (emulated
      ? process.env.EXPO_PUBLIC_RECEIPTS_API_URL &&
        `${process.env.EXPO_PUBLIC_RECEIPTS_API_URL}/invitations`
      : "https://us-west1-dailybudget-35c26.cloudfunctions.net/familyInvitationsApi");
  if (!endpoint)
    throw new Error("Invitation email is not configured in this environment.");
  const token = await withTimeout(user.getIdToken(), 15000);
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("Your signed-in account changed. Please retry.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        role,
        requestId,
      }),
    });
    if (auth.currentUser?.uid !== user.uid)
      throw new Error("Your signed-in account changed. Please retry.");
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
      throw Object.assign(
        new Error(
          data.message ||
            "Automatic email is unavailable. You can create a share link instead.",
        ),
        { code: data.code },
      );
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        "Email confirmation took too long. Retry the same request to check its result without sending a duplicate, or create a share link.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function createShareInvitation(
  email: string,
  role: FamilyRole,
): Promise<InvitationResult> {
  if (!validInvitationEmail(email))
    throw new Error("Enter one valid email address.");
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const family = await getFamilyContext(user.uid);
  if (family?.role !== "admin")
    throw new Error("Only a family administrator can create invitations.");
  const bytes = await Crypto.getRandomBytesAsync(4);
  const code = String(
    bytes.reduce((value, byte) => value * 256 + byte, 0) % 100000000,
  ).padStart(8, "0");
  const expiresAt = Date.now() + 10 * 60000;
  if (auth.currentUser?.uid !== user.uid)
    throw new Error("Your signed-in account changed. Please retry.");
  await addDoc(collection(db, "invites"), {
    email: email.trim().toLowerCase(),
    familyId: family.familyId,
    role,
    createdBy: user.uid,
    code,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(expiresAt),
  });
  return {
    status: "manual",
    email: email.trim().toLowerCase(),
    code,
    expiresAt,
    joinUrl: invitationLink(code),
  };
}
