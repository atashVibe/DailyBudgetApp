import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./auth";

export type EntryType = "expense" | "income" | "refund" | "cashback";

export type EntryData = {
  familyId: string;
  userId?: string;
  amount: number;
  budgetAreaId: string;
  categoryId: string;
  type: EntryType;
  note: string;
  date: string;
};

// Creates a new financial entry inside the shared "entries" collection.
// Each entry belongs to a specific family and user.
//
// We add serverTimestamp() so Firestore stores a consistent creation time
// regardless of the user's local device clock.
export async function addEntry(data: EntryData) {
  try {
    if (!data.familyId) {
      throw new Error("Missing familyId when adding entry");
    }

    const docRef = await addDoc(collection(db, "entries"), {
      ...data,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error adding entry:", error);
    throw error;
  }
}

// Permanently removes an entry document from Firestore.
export async function deleteEntry(entryId: string) {
  try {
    await deleteDoc(doc(db, "entries", entryId));
  } catch (error) {
    console.error("Error deleting entry:", error);
    throw error;
  }
}

// Updates editable fields of an existing financial entry.
export async function updateEntry(entryId: string, data: Partial<EntryData>) {
  try {
    await updateDoc(doc(db, "entries", entryId), {
      ...data,
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    throw error;
  }
}
