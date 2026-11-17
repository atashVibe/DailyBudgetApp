import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "./auth";
import { saveCategoryReceiptRequirement } from "./receipts";

export type CategoryType = "expense" | "income" | "refund" | "cashback";

export type Category = {
  id: string;
  name: string;
  familyId: string;
  budgetAreaId: string;
  type: CategoryType;
  isDefault: boolean;
  isArchived: boolean;
  requiresReceipt?: boolean;
  iconName?: string;
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
  requiresReceipt = false,
): Promise<Category> => {
  if (requiresReceipt)
    return saveCategoryReceiptRequirement({
      familyId,
      categoryId: doc(collection(db, "categories")).id,
      required: true,
      create: { name, type, budgetAreaId },
    });
  const docRef = await addDoc(collection(db, "categories"), {
    name,
    type,
    budgetAreaId,
    familyId,
    isDefault: false,
    isArchived: false,
    requiresReceipt,
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
    requiresReceipt,
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

export async function setCategoryReceiptRequired(
  categoryId: string,
  requiresReceipt: boolean,
  familyId: string,
) {
  if (requiresReceipt)
    return saveCategoryReceiptRequirement({
      familyId,
      categoryId,
      required: true,
    });
  await updateDoc(doc(db, "categories", categoryId), { requiresReceipt });
}

export function subscribeCategories(
  familyId: string,
  budgetAreaId: string,
  onChange: (categories: Category[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, "categories"),
      where("familyId", "==", familyId),
      where("budgetAreaId", "==", budgetAreaId),
      where("isArchived", "==", false),
    ),
    (snapshot) =>
      onChange(
        snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }) as Category)
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    onError,
  );
}

export async function updateCategoryIcon(categoryId: string, iconName: string) {
  await updateDoc(doc(db, "categories", categoryId), { iconName });
}
