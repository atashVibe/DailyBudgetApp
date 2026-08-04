import { updateProfile, type User } from "firebase/auth";
import { doc, writeBatch } from "firebase/firestore";
import { db } from "./auth";

export async function saveUserDisplayName(
  user: User,
  familyId: string,
  displayName: string,
) {
  const normalizedName = displayName.trim().replace(/\s+/g, " ");
  if (!normalizedName || normalizedName.length > 80) {
    throw new Error("Enter a name between 1 and 80 characters.");
  }

  await updateProfile(user, { displayName: normalizedName });

  const batch = writeBatch(db);
  batch.set(
    doc(db, "users", user.uid),
    { displayName: normalizedName },
    { merge: true },
  );
  batch.update(doc(db, "familyMembers", `${familyId}_${user.uid}`), {
    displayName: normalizedName,
  });
  await batch.commit();

  return normalizedName;
}
