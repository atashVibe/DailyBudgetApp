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

export type CategoryType = "expense" | "income" | "refund" | "cashback";

export type Category = {
  id: string;
  name: string;
  familyId: string;
  budgetAreaId: string;
  type: CategoryType;
  isDefault: boolean;
  isArchived: boolean;
};

export const getCategories = async (
  familyId: string,
  budgetAreaId: string,
): Promise<Category[]> => {
  const q = query(
    collection(db, "categories"),
    where("familyId", "==", familyId),
    where("budgetAreaId", "==", budgetAreaId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<Category, "id">),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const addCategory = async (
  familyId: string,
  userId: string,
  budgetAreaId: string,
  name: string,
  type: CategoryType,
): Promise<Category> => {
  const docRef = await addDoc(collection(db, "categories"), {
    name,
    type,
    budgetAreaId,
    familyId,
    isDefault: false,
    isArchived: false,
    createdBy: userId,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    name,
    type,
    budgetAreaId,
    familyId,
    isDefault: false,
    isArchived: false,
  };
};

export const setDefaultCategory = async (
  familyId: string,
  budgetAreaId: string,
  categoryId: string,
) => {
  const categories = await getCategories(familyId, budgetAreaId);
  const batch = writeBatch(db);

  categories.forEach((category) => {
    batch.update(doc(db, "categories", category.id), {
      isDefault: category.id === categoryId,
    });
  });

  await batch.commit();
};

export const archiveCategory = async (categoryId: string) => {
  await updateDoc(doc(db, "categories", categoryId), {
    isArchived: true,
  });
};

export const updateCategory = async (
  categoryId: string,
  name: string,
  type: CategoryType,
) => {
  await updateDoc(doc(db, "categories", categoryId), {
    name,
    type,
  });
};

export const getAllCategoriesForFamily = async (
  familyId: string,
): Promise<Category[]> => {
  const q = query(
    collection(db, "categories"),
    where("familyId", "==", familyId),
    where("isArchived", "==", false),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      ...(docItem.data() as Omit<Category, "id">),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
