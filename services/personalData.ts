import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./auth";

const MAX_BATCH_WRITES = 400;

type Removal = {
  ref: DocumentReference;
  fields: Set<string>;
};

export async function removePersonalFamilyAttribution(
  familyId: string,
  userId: string,
  email?: string | null,
) {
  const normalizedEmail = email?.trim().toLowerCase();
  const [
    family,
    entries,
    budgetAreas,
    categories,
    createdInvites,
    acceptedInvites,
    emailInvites,
  ] = await Promise.all([
    getDoc(doc(db, "families", familyId)),
    getDocs(
      query(
        collection(db, "entries"),
        where("familyId", "==", familyId),
        where("userId", "==", userId),
      ),
    ),
    getDocs(
      query(
        collection(db, "budgetAreas"),
        where("familyId", "==", familyId),
        where("createdBy", "==", userId),
      ),
    ),
    getDocs(
      query(
        collection(db, "categories"),
        where("familyId", "==", familyId),
        where("createdBy", "==", userId),
      ),
    ),
    getDocs(
      query(
        collection(db, "invites"),
        where("familyId", "==", familyId),
        where("createdBy", "==", userId),
      ),
    ),
    getDocs(
      query(
        collection(db, "invites"),
        where("familyId", "==", familyId),
        where("acceptedBy", "==", userId),
      ),
    ),
    normalizedEmail
      ? getDocs(
          query(
            collection(db, "invites"),
            where("familyId", "==", familyId),
            where("email", "==", normalizedEmail),
          ),
        )
      : Promise.resolve(null),
  ]);

  const deletes = new Map<string, DocumentReference>();
  emailInvites?.docs.forEach((item) => deletes.set(item.ref.path, item.ref));

  const removals = new Map<string, Removal>();
  const addRemoval = (ref: DocumentReference, field: string) => {
    if (deletes.has(ref.path)) return;
    const existing = removals.get(ref.path);
    if (existing) {
      existing.fields.add(field);
    } else {
      removals.set(ref.path, { ref, fields: new Set([field]) });
    }
  };

  if (family.exists()) {
    if (family.data().createdBy === userId) {
      addRemoval(family.ref, "createdBy");
    }
    if (family.data().deletedBy === userId) {
      addRemoval(family.ref, "deletedBy");
    }
  }

  entries.docs.forEach((item) => addRemoval(item.ref, "userId"));
  budgetAreas.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  categories.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  createdInvites.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  acceptedInvites.docs.forEach((item) => addRemoval(item.ref, "acceptedBy"));

  const operations = [
    ...Array.from(deletes.values(), (ref) => ({
      kind: "delete" as const,
      ref,
    })),
    ...Array.from(removals.values(), (removal) => ({
      kind: "remove" as const,
      ref: removal.ref,
      fields: Array.from(removal.fields),
    })),
  ];

  for (let index = 0; index < operations.length; index += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    operations.slice(index, index + MAX_BATCH_WRITES).forEach((operation) => {
      if (operation.kind === "delete") {
        batch.delete(operation.ref);
      } else {
        batch.update(
          operation.ref,
          Object.fromEntries(
            operation.fields.map((field) => [field, deleteField()]),
          ),
        );
      }
    });
    await batch.commit();
  }
}
