import { auth } from "./auth";
import { receiptRequest } from "./receipts";

export type FamilyLeaveReview = {
  familyId: string;
  familyName: string;
  revision: string;
  canLeave: boolean;
  reason: string | null;
  isStorePayer: boolean;
};

async function call<T>(uid: string, body?: FamilyLeaveReview): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await receiptRequest(
      "/family/leave",
      {
        signal: controller.signal,
        ...(body
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                familyId: body.familyId,
                revision: body.revision,
              }),
            }
          : {}),
      },
      uid,
    );
    if (auth.currentUser?.uid !== uid)
      throw new Error("Your signed-in account changed. Reopen family options.");
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError")
      throw new Error(
        body
          ? "The family update could not be confirmed. Reopen the app to check your current family before trying again."
          : "Your family information could not be checked. Please try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
export const prepareFamilyLeave = (uid: string) => call<FamilyLeaveReview>(uid);
export const leaveFamily = (uid: string, review: FamilyLeaveReview) =>
  call<{ left: boolean }>(uid, review);
