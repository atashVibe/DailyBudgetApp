import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "./auth";

export type EntryKind = {
  id: string;
  familyId: string;
  budgetAreaId: string;
  name: string;
  type: "expense" | "income" | "refund";
  isArchived: boolean;
};

export const getEntryKinds = async (
  familyId: string,
  budgetAreaId: string,
): Promise<EntryKind[]> => {
  const q = query(
    collection(db, "entryKinds"),
    where("familyId", "==", familyId),
    where("budgetAreaId", "==", budgetAreaId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<EntryKind, "id">),
  }));
};
