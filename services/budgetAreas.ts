import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "./auth";

export const getBudgetAreas = async (familyId: string) => {
  const q = query(
    collection(db, "budgetAreas"),
    where("familyId", "==", familyId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
