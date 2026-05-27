import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./auth";

export type BudgetArea = {
  id: string;
  name: string;
  familyId: string;
  isArchived: boolean;
};

export const getBudgetAreas = async (
  familyId: string,
): Promise<BudgetArea[]> => {
  const q = query(
    collection(db, "budgetAreas"),
    where("familyId", "==", familyId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...(docItem.data() as Omit<BudgetArea, "id">),
  }));
};

export const addBudgetArea = async (
  familyId: string,
  userId: string,
  name: string,
) => {
  await addDoc(collection(db, "budgetAreas"), {
    name,
    familyId,
    isDefault: false,
    isArchived: false,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });
};

export const archiveBudgetArea = async (budgetAreaId: string) => {
  await updateDoc(doc(db, "budgetAreas", budgetAreaId), {
    isArchived: true,
  });
};
