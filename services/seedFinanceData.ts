import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db } from "./auth";

import { DEFAULT_BUDGET_AREAS } from "../constants/defaultFinanceData";

export const seedFinanceData = async (familyId: string, userId: string) => {
  for (const area of DEFAULT_BUDGET_AREAS) {
    const budgetAreaRef = await addDoc(collection(db, "budgetAreas"), {
      name: area.name,

      familyId,

      isDefault: true,

      isArchived: false,

      createdBy: userId,

      createdAt: serverTimestamp(),
    });

    for (const categoryName of area.categories) {
      await addDoc(collection(db, "categories"), {
        name: categoryName,

        budgetAreaId: budgetAreaRef.id,

        familyId,

        isDefault: true,

        isArchived: false,

        createdBy: userId,

        createdAt: serverTimestamp(),
      });
    }
  }
};
