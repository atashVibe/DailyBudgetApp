import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "./auth";

export const getCategories = async (familyId: string, budgetAreaId: string) => {
  const q = query(
    collection(db, "categories"),
    where("familyId", "==", familyId),
    where("budgetAreaId", "==", budgetAreaId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
