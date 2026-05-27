import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { DEFAULT_BUDGET_AREAS } from "../constants/defaultFinanceData";
import { db } from "./auth";

export const seedFinanceData = async (familyId: string, userId: string) => {
  console.log("seedFinanceData started");

  for (const area of DEFAULT_BUDGET_AREAS) {
    console.log("Creating budget area:", area.name);

    const budgetAreaRef = await addDoc(collection(db, "budgetAreas"), {
      name: area.name,
      kind: area.kind,
      familyId,
      isDefault: true,
      isArchived: false,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });

    for (const category of area.categories) {
      console.log("Creating category:", category.name);

      await addDoc(collection(db, "categories"), {
        name: category.name,
        type: category.type,
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
