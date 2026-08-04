import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const projectId = "dailybudget-rules-test";
let testEnv;

function signedIn(userId, email) {
  return testEnv.authenticatedContext(userId, {
    email,
    email_verified: true,
  }).firestore();
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: await readFile("firestore.rules", "utf8"),
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const seed = writeBatch(db);

    seed.set(doc(db, "families", "family-a"), {
      name: "Family A",
      dailyBudget: 30,
      status: "active",
      createdBy: "admin-a",
    });
    seed.set(doc(db, "families", "family-b"), {
      name: "Family B",
      dailyBudget: 40,
      status: "active",
      createdBy: "admin-b",
    });
    seed.set(doc(db, "users", "admin-a"), {
      activeFamilyId: "family-a",
      role: "admin",
      email: "admin-a@example.com",
    });
    seed.set(doc(db, "users", "member-a"), {
      activeFamilyId: "family-a",
      role: "member",
      email: "member-a@example.com",
    });
    seed.set(doc(db, "users", "admin-b"), {
      activeFamilyId: "family-b",
      role: "admin",
      email: "admin-b@example.com",
    });
    seed.set(doc(db, "familyMembers", "family-a_admin-a"), {
      familyId: "family-a",
      userId: "admin-a",
      email: "admin-a@example.com",
      role: "admin",
      status: "active",
    });
    seed.set(doc(db, "familyMembers", "family-a_member-a"), {
      familyId: "family-a",
      userId: "member-a",
      email: "member-a@example.com",
      role: "member",
      status: "active",
    });
    seed.set(doc(db, "familyMembers", "family-b_admin-b"), {
      familyId: "family-b",
      userId: "admin-b",
      email: "admin-b@example.com",
      role: "admin",
      status: "active",
    });
    seed.set(doc(db, "budgetAreas", "area-a"), {
      familyId: "family-a",
      name: "Daily Life",
      isDefault: true,
      isArchived: false,
      createdBy: "admin-a",
    });
    seed.set(doc(db, "budgetAreas", "area-b"), {
      familyId: "family-b",
      name: "Other Family",
      isDefault: true,
      isArchived: false,
      createdBy: "admin-b",
    });
    seed.set(doc(db, "categories", "category-a"), {
      familyId: "family-a",
      budgetAreaId: "area-a",
      name: "Groceries",
      type: "expense",
      isDefault: true,
      isArchived: false,
      createdBy: "admin-a",
    });
    seed.set(doc(db, "entries", "entry-a"), {
      familyId: "family-a",
      userId: "member-a",
      amount: 12,
      budgetAreaId: "area-a",
      categoryId: "category-a",
      type: "expense",
      note: "Milk",
      date: "2026-08-03",
    });
    seed.set(doc(db, "entries", "entry-b"), {
      familyId: "family-b",
      userId: "admin-b",
      amount: 20,
      budgetAreaId: "area-b",
      categoryId: "category-b",
      type: "expense",
      note: "Private",
      date: "2026-08-03",
    });
    seed.set(doc(db, "invites", "invite-a"), {
      familyId: "family-a",
      email: "invitee@example.com",
      role: "member",
      code: "12345678",
      status: "pending",
      createdBy: "admin-a",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    seed.set(doc(db, "invites", "accepted-invite-a"), {
      familyId: "family-a",
      email: "member-a@example.com",
      role: "member",
      code: "87654321",
      status: "accepted",
      createdBy: "admin-a",
      acceptedBy: "member-a",
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await seed.commit();
  });
});

after(async () => {
  await testEnv?.cleanup();
});

test("active family members can read their family data", async () => {
  const admin = signedIn("admin-a", "admin-a@example.com");
  const member = signedIn("member-a", "member-a@example.com");

  await assertSucceeds(getDoc(doc(admin, "families", "family-a")));
  await assertSucceeds(getDoc(doc(member, "budgetAreas", "area-a")));
  await assertSucceeds(getDoc(doc(member, "entries", "entry-a")));
});

test("unrelated and signed-out users cannot read another family", async () => {
  const otherFamily = signedIn("admin-b", "admin-b@example.com");
  const signedOut = testEnv.unauthenticatedContext().firestore();

  await assertFails(getDoc(doc(otherFamily, "families", "family-a")));
  await assertFails(getDoc(doc(otherFamily, "entries", "entry-a")));
  await assertFails(getDoc(doc(signedOut, "families", "family-a")));
  await assertFails(
    getDocs(
      query(
        collection(otherFamily, "entries"),
        where("familyId", "==", "family-a"),
      ),
    ),
  );
});

test("members can add entries but cannot perform administrator actions", async () => {
  const member = signedIn("member-a", "member-a@example.com");

  await assertSucceeds(
    setDoc(doc(member, "entries", "member-entry"), {
      familyId: "family-a",
      userId: "member-a",
      amount: 5,
      budgetAreaId: "area-a",
      categoryId: "category-a",
      type: "expense",
      note: "Coffee",
      date: "2026-08-03",
    }),
  );
  await assertFails(
    setDoc(doc(member, "entries", "forged-entry"), {
      familyId: "family-a",
      userId: "admin-a",
      amount: 100,
    }),
  );
  await assertFails(
    updateDoc(doc(member, "families", "family-a"), { dailyBudget: 999 }),
  );
  await assertFails(
    updateDoc(doc(member, "budgetAreas", "area-a"), { name: "Changed" }),
  );
  await assertFails(
    setDoc(doc(member, "invites", "member-invite"), {
      familyId: "family-a",
      email: "friend@example.com",
      role: "member",
      code: "87654321",
      status: "pending",
      createdBy: "member-a",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    }),
  );
});

test("administrators can manage their family but not another family", async () => {
  const admin = signedIn("admin-a", "admin-a@example.com");

  await assertSucceeds(
    updateDoc(doc(admin, "families", "family-a"), { dailyBudget: 35 }),
  );
  await assertSucceeds(
    updateDoc(doc(admin, "budgetAreas", "area-a"), { name: "Essentials" }),
  );
  await assertSucceeds(
    setDoc(doc(admin, "invites", "new-invite"), {
      familyId: "family-a",
      email: "friend@example.com",
      role: "member",
      code: "87654321",
      status: "pending",
      createdBy: "admin-a",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    }),
  );
  await assertFails(
    updateDoc(doc(admin, "families", "family-b"), { dailyBudget: 1 }),
  );
  await assertFails(
    updateDoc(doc(admin, "budgetAreas", "area-b"), { name: "Stolen" }),
  );
});

test("a member cannot promote their own profile to administrator", async () => {
  const member = signedIn("member-a", "member-a@example.com");

  await assertFails(
    updateDoc(doc(member, "users", "member-a"), { role: "admin" }),
  );
});

test("only the addressed signed-in user can look up an invitation", async () => {
  const invitee = signedIn("invitee", "invitee@example.com");
  const stranger = signedIn("stranger", "stranger@example.com");
  const inviteQuery = (db) =>
    query(
      collection(db, "invites"),
      where("code", "==", "12345678"),
      where("status", "==", "pending"),
      where("email", "==", "invitee@example.com"),
    );

  await assertSucceeds(getDocs(inviteQuery(invitee)));
  await assertFails(getDocs(inviteQuery(stranger)));
});

test("an invited user can join only through the atomic acceptance batch", async () => {
  const invitee = signedIn("invitee", "invitee@example.com");
  const batch = writeBatch(invitee);

  batch.set(doc(invitee, "users", "invitee"), {
    activeFamilyId: "family-a",
    role: "member",
    email: "invitee@example.com",
  });
  batch.set(doc(invitee, "familyMembers", "family-a_invitee"), {
    familyId: "family-a",
    userId: "invitee",
    email: "invitee@example.com",
    role: "member",
    status: "active",
    joinedAt: serverTimestamp(),
    inviteId: "invite-a",
  });
  batch.update(doc(invitee, "invites", "invite-a"), {
    status: "accepted",
    acceptedBy: "invitee",
    acceptedAt: serverTimestamp(),
  });

  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(invitee, "families", "family-a")));
});

test("leaving a family removes access immediately", async () => {
  const member = signedIn("member-a", "member-a@example.com");

  await assertSucceeds(
    updateDoc(doc(member, "familyMembers", "family-a_member-a"), {
      status: "inactive",
      leftAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(member, "families", "family-a")));
  await assertFails(getDoc(doc(member, "entries", "entry-a")));
});

test("users can remove their identity during account deletion", async () => {
  const member = signedIn("member-a", "member-a@example.com");
  const admin = signedIn("admin-a", "admin-a@example.com");

  await assertSucceeds(
    updateDoc(doc(member, "entries", "entry-a"), {
      userId: deleteField(),
    }),
  );

  await assertSucceeds(deleteDoc(doc(member, "users", "member-a")));

  await assertSucceeds(
    updateDoc(doc(admin, "invites", "accepted-invite-a"), {
      createdBy: deleteField(),
    }),
  );
});

test("members can set only their own family display name", async () => {
  const member = signedIn("member-a", "member-a@example.com");

  await assertSucceeds(
    updateDoc(doc(member, "familyMembers", "family-a_member-a"), {
      displayName: "Member A",
    }),
  );
  await assertFails(
    updateDoc(doc(member, "familyMembers", "family-a_admin-a"), {
      displayName: "Not the administrator",
    }),
  );
});

test("a new owner can atomically create their protected profile and membership", async () => {
  const owner = signedIn("new-owner", "owner@example.com");

  await assertSucceeds(
    setDoc(doc(owner, "families", "new-family"), {
      name: "New Family",
      dailyBudget: 30,
      status: "active",
      createdBy: "new-owner",
    }),
  );

  const batch = writeBatch(owner);
  batch.set(doc(owner, "users", "new-owner"), {
    activeFamilyId: "new-family",
    role: "admin",
    email: "owner@example.com",
  });
  batch.set(doc(owner, "familyMembers", "new-family_new-owner"), {
    familyId: "new-family",
    userId: "new-owner",
    email: "owner@example.com",
    role: "admin",
    status: "active",
  });

  await assertSucceeds(batch.commit());
});
