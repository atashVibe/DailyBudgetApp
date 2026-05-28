import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "./auth";

export type BudgetArea = {
  id: string;
  name: string;
  familyId: string;
  isDefault: boolean;
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

  return snapshot.docs
    .map((docItem) => {
      const data = docItem.data();

      return {
        id: docItem.id,
        name: data.name,
        familyId: data.familyId,
        isDefault: data.isDefault,
        isArchived: data.isArchived,
      };
    })
    .sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;

      return a.name.localeCompare(b.name);
    });
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

export const setDefaultBudgetArea = async (
  familyId: string,
  budgetAreaId: string,
) => {
  const budgetAreas = await getBudgetAreas(familyId);
  const batch = writeBatch(db);

  budgetAreas.forEach((budgetArea) => {
    batch.update(doc(db, "budgetAreas", budgetArea.id), {
      isDefault: budgetArea.id === budgetAreaId,
    });
  });

  await batch.commit();
};

export const archiveBudgetArea = async (
  familyId: string,
  budgetAreaId: string,
) => {
  const budgetAreas = await getBudgetAreas(familyId);
  const budgetAreaToArchive = budgetAreas.find(
    (area) => area.id === budgetAreaId,
  );

  await updateDoc(doc(db, "budgetAreas", budgetAreaId), {
    isArchived: true,
    isDefault: false,
  });

  if (budgetAreaToArchive?.isDefault) {
    const nextDefault = budgetAreas.find((area) => area.id !== budgetAreaId);

    if (nextDefault) {
      await setDefaultBudgetArea(familyId, nextDefault.id);
    }
  }
};

export const updateBudgetAreaName = async (
  budgetAreaId: string,
  name: string,
) => {
  await updateDoc(doc(db, "budgetAreas", budgetAreaId), {
    name,
  });
};
