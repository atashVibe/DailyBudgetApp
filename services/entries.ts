import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./auth";

// Save a new entry to Firestore
export async function addEntry(data: any) {
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

// Delete an entry
export async function deleteEntry(entryId: string) {
  try {
    await deleteDoc(doc(db, "entries", entryId));
  } catch (error) {
    console.error("Error deleting entry:", error);
    throw error;
  }
}

// Update an entry
export async function updateEntry(entryId: string, data: any) {
  try {
    await updateDoc(doc(db, "entries", entryId), {
      ...data,
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    throw error;
  }
}
