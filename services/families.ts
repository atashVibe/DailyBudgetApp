import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Platform, Share } from "react-native";
import { db } from "./auth";

export type FamilyRole = "admin" | "member";

export type FamilyContext = {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  activeAdminCount: number;
};

export type ExportBudgetArea = {
  id: string;
  name: string;
};

export type FamilyAdmin = {
  userId: string;
  name: string | null;
  email: string | null;
  isCurrentUser: boolean;
};

export class FamilyActionError extends Error {
  constructor(
    public readonly code:
      | "LAST_ADMIN"
      | "INVALID_INVITE"
      | "INVITE_EMAIL_MISMATCH"
      | "INVITE_EXPIRED"
      | "SAME_FAMILY",
    message: string,
  ) {
    super(message);
  }
}

export async function getFamilyContext(
  userId: string,
): Promise<FamilyContext | null> {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) return null;

  const familyId = userSnap.data().activeFamilyId as string | undefined;
  if (!familyId) return null;

  const [familySnap, membershipSnap, adminSnapshot] = await Promise.all([
    getDoc(doc(db, "families", familyId)),
    getDoc(doc(db, "familyMembers", `${familyId}_${userId}`)),
    getDocs(
      query(
        collection(db, "familyMembers"),
        where("familyId", "==", familyId),
      ),
    ),
  ]);

  if (!familySnap.exists() || familySnap.data().status === "deleted") {
    return null;
  }

  const role =
    membershipSnap.exists() && membershipSnap.data().role === "admin"
      ? "admin"
      : "member";

  return {
    familyId,
    familyName: familySnap.data().name || "Current family",
    role,
    activeAdminCount: adminSnapshot.docs.filter(
      (item) =>
        item.data().role === "admin" && item.data().status === "active",
    ).length,
  };
}

export async function joinFamilyWithCode(
  userId: string,
  userEmail: string,
  code: string,
  displayName?: string | null,
) {
  const currentContext = await getFamilyContext(userId);

  if (currentContext?.role === "admin" && currentContext.activeAdminCount <= 1) {
    throw new FamilyActionError(
      "LAST_ADMIN",
      "You are the only administrator of this family. Invite another administrator before leaving, or delete the current family.",
    );
  }

  const inviteSnapshot = await getDocs(
    query(
      collection(db, "invites"),
      where("code", "==", code),
      where("status", "==", "pending"),
      where("email", "==", userEmail.trim().toLowerCase()),
    ),
  );

  if (inviteSnapshot.empty) {
    throw new FamilyActionError(
      "INVALID_INVITE",
      "This invite code is invalid or has already been used.",
    );
  }

  const inviteDoc = inviteSnapshot.docs[0];
  const invite = inviteDoc.data();
  const normalizedEmail = userEmail.trim().toLowerCase();

  if (invite.email?.trim().toLowerCase() !== normalizedEmail) {
    throw new FamilyActionError(
      "INVITE_EMAIL_MISMATCH",
      "This invite code was created for a different email address.",
    );
  }

  const expiresAt = invite.expiresAt?.toDate?.();
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    throw new FamilyActionError(
      "INVITE_EXPIRED",
      "This invite code has expired.",
    );
  }

  const nextFamilyId = invite.familyId as string;
  if (currentContext?.familyId === nextFamilyId) {
    throw new FamilyActionError(
      "SAME_FAMILY",
      "You already belong to this family.",
    );
  }

  const role: FamilyRole = invite.role === "admin" ? "admin" : "member";
  const batch = writeBatch(db);

  batch.set(
    doc(db, "users", userId),
    {
      activeFamilyId: nextFamilyId,
      role,
      email: normalizedEmail,
    },
    { merge: true },
  );
  batch.set(doc(db, "familyMembers", `${nextFamilyId}_${userId}`), {
    familyId: nextFamilyId,
    userId,
    email: normalizedEmail,
    role,
    status: "active",
    joinedAt: serverTimestamp(),
    inviteId: inviteDoc.id,
    ...(displayName?.trim() ? { displayName: displayName.trim() } : {}),
  });
  batch.update(doc(db, "invites", inviteDoc.id), {
    status: "accepted",
    acceptedBy: userId,
    acceptedAt: serverTimestamp(),
  });

  if (currentContext) {
    batch.update(
      doc(db, "familyMembers", `${currentContext.familyId}_${userId}`),
      {
        status: "inactive",
        leftAt: serverTimestamp(),
      },
    );
  }

  await batch.commit();
  return { familyId: nextFamilyId, role };
}

export async function getFamilyBudgetAreas(
  familyId: string,
): Promise<ExportBudgetArea[]> {
  const snapshot = await getDocs(
    query(collection(db, "budgetAreas"), where("familyId", "==", familyId)),
  );

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      name: String(item.data().name || "Unnamed budget area"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFamilyAdmins(
  familyId: string,
  currentUserId: string,
  currentUserEmail?: string | null,
  currentUserName?: string | null,
): Promise<FamilyAdmin[]> {
  const [memberSnapshot, inviteSnapshot] = await Promise.all([
    getDocs(
      query(
        collection(db, "familyMembers"),
        where("familyId", "==", familyId),
      ),
    ),
    getDocs(
      query(collection(db, "invites"), where("familyId", "==", familyId)),
    ),
  ]);

  const invitedEmails = new Map<string, string>();
  inviteSnapshot.docs.forEach((item) => {
    const data = item.data();
    if (
      data.role === "admin" &&
      data.status === "accepted" &&
      data.acceptedBy &&
      data.email
    ) {
      invitedEmails.set(data.acceptedBy, String(data.email));
    }
  });

  const currentMembership = memberSnapshot.docs.find(
    (item) => item.data().userId === currentUserId,
  );
  if (currentMembership) {
    const membershipUpdates: Record<string, string> = {};
    if (!currentMembership.data().email && currentUserEmail) {
      membershipUpdates.email = currentUserEmail.trim().toLowerCase();
    }
    if (
      currentUserName?.trim() &&
      currentMembership.data().displayName !== currentUserName.trim()
    ) {
      membershipUpdates.displayName = currentUserName.trim();
    }
    if (Object.keys(membershipUpdates).length > 0) {
      await updateDoc(currentMembership.ref, membershipUpdates);
    }
  }

  return memberSnapshot.docs
    .map((item) => item.data())
    .filter(
      (member) =>
        member.role === "admin" && member.status === "active",
    )
    .map((member) => ({
      userId: String(member.userId),
      name:
        member.displayName ||
        (member.userId === currentUserId ? currentUserName : null) ||
        null,
      email:
        member.email ||
        invitedEmails.get(String(member.userId)) ||
        (member.userId === currentUserId ? currentUserEmail : null) ||
        null,
      isCurrentUser: member.userId === currentUserId,
    }))
    .sort((a, b) => {
      if (a.isCurrentUser !== b.isCurrentUser) {
        return a.isCurrentUser ? -1 : 1;
      }
      return (a.name || a.email || a.userId).localeCompare(
        b.name || b.email || b.userId,
      );
    });
}

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function exportFamilyEntries(
  familyId: string,
  familyName: string,
  selectedBudgetAreaIds?: string[],
) {
  const [entrySnapshot, areaSnapshot, categorySnapshot] = await Promise.all([
    getDocs(query(collection(db, "entries"), where("familyId", "==", familyId))),
    getDocs(
      query(collection(db, "budgetAreas"), where("familyId", "==", familyId)),
    ),
    getDocs(
      query(collection(db, "categories"), where("familyId", "==", familyId)),
    ),
  ]);

  const areaNames = new Map(
    areaSnapshot.docs.map((item) => [item.id, item.data().name]),
  );
  const categoryNames = new Map(
    categorySnapshot.docs.map((item) => [item.id, item.data().name]),
  );
  const selected = selectedBudgetAreaIds?.length
    ? new Set(selectedBudgetAreaIds)
    : null;

  const rows = entrySnapshot.docs
    .map((item) => item.data())
    .filter((entry) => !selected || selected.has(entry.budgetAreaId))
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((entry) =>
      [
        entry.date,
        areaNames.get(entry.budgetAreaId) || entry.budgetAreaId,
        categoryNames.get(entry.categoryId) || entry.categoryId,
        entry.type,
        entry.amount,
        entry.note,
      ]
        .map(csvValue)
        .join(","),
    );

  const csv = [
    "Date,Budget Area,Category,Type,Amount,Note",
    ...rows,
  ].join("\n");
  const safeName =
    familyName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") ||
    "family";
  const fileName = `${safeName}-budget-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({
      title: fileName,
      message: csv,
    });
  }

  return rows.length;
}

export async function deleteFamily(familyId: string, userId: string) {
  const context = await getFamilyContext(userId);
  if (!context || context.familyId !== familyId || context.role !== "admin") {
    throw new Error("Only a current family administrator can delete a family.");
  }

  const [areas, categories, members, invites] = await Promise.all([
    getDocs(
      query(collection(db, "budgetAreas"), where("familyId", "==", familyId)),
    ),
    getDocs(
      query(collection(db, "categories"), where("familyId", "==", familyId)),
    ),
    getDocs(
      query(collection(db, "familyMembers"), where("familyId", "==", familyId)),
    ),
    getDocs(
      query(collection(db, "invites"), where("familyId", "==", familyId)),
    ),
  ]);
  const batch = writeBatch(db);

  batch.update(doc(db, "families", familyId), {
    status: "deleted",
    deletedAt: serverTimestamp(),
    deletedBy: userId,
  });
  batch.set(
    doc(db, "users", userId),
    { activeFamilyId: null, role: null },
    { merge: true },
  );
  areas.docs.forEach((item) =>
    batch.update(item.ref, { isArchived: true, isDefault: false }),
  );
  categories.docs.forEach((item) =>
    batch.update(item.ref, { isArchived: true, isDefault: false }),
  );
  members.docs.forEach((item) =>
    batch.update(item.ref, {
      status: "inactive",
      familyDeletedAt: serverTimestamp(),
    }),
  );
  invites.docs.forEach((item) => {
    if (item.data().status === "pending") {
      batch.update(item.ref, { status: "cancelled" });
    }
  });

  await batch.commit();
}
