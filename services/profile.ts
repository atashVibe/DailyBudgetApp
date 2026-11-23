import { updateProfile, type User } from "firebase/auth";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "./auth";

export async function saveUserDisplayName(
  user: User,
  familyId: string | null,
  displayName: string,
) {
  const normalizedName = displayName.trim().replace(/\s+/g, " ");
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error("Enter a name between 1 and 80 characters.");
  }

  await updateProfile(user, { displayName: normalizedName });

  await runTransaction(db, async (tx) => {
    const profileRef = doc(db, "users", user.uid);
    const profile = await tx.get(profileRef);
    const currentFamilyId = profile.data()?.activeFamilyId;
    const memberRef =
      currentFamilyId && (!familyId || familyId === currentFamilyId)
        ? doc(db, "familyMembers", `${currentFamilyId}_${user.uid}`)
        : null;
    const member = memberRef ? await tx.get(memberRef) : null;
    if (profile.exists())
      tx.update(profileRef, { displayName: normalizedName });
    else
      tx.set(profileRef, {
        displayName: normalizedName,
        email: user.email || "",
        activeFamilyId: null,
        role: null,
      });
    if (memberRef && member?.data()?.status === "active")
      tx.update(memberRef, { displayName: normalizedName });
  });

  return normalizedName;
}
