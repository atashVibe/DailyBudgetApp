import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./auth";

// Save a new entry to Firestore
export async function addEntry(data: any) {
  try {
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