import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  revokeAccessToken,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteField,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "./auth";

export type AccountReauthenticationMethod = "password" | "google" | "apple";

export class AccountDeletionError extends Error {
  constructor(
    public readonly code:
      | "LAST_ADMIN"
      | "PASSWORD_REQUIRED"
      | "UNSUPPORTED_PROVIDER",
    message: string,
  ) {
    super(message);
  }
}

type AccountDeletionPlan = {
  soloFamilyIds: string[];
};

const MAX_BATCH_WRITES = 400;

export function getAccountReauthenticationMethod(
  user: User,
): AccountReauthenticationMethod {
  const providerIds = new Set(
    user.providerData.map((provider) => provider.providerId),
  );

  if (providerIds.has("apple.com")) return "apple";
  if (providerIds.has("google.com")) return "google";
  if (providerIds.has("password")) return "password";

  throw new AccountDeletionError(
    "UNSUPPORTED_PROVIDER",
    "This sign-in method is not supported by account deletion yet. Please contact support.",
  );
}

async function getDeletionPlan(userId: string): Promise<AccountDeletionPlan> {
  const memberships = await getDocs(
    query(collection(db, "familyMembers"), where("userId", "==", userId)),
  );
  const soloFamilyIds: string[] = [];

  for (const membership of memberships.docs) {
    const data = membership.data();
    if (data.status !== "active" || data.role !== "admin") continue;

    const familyId = String(data.familyId);
    const familyMembers = await getDocs(
      query(collection(db, "familyMembers"), where("familyId", "==", familyId)),
    );
    const activeMembers = familyMembers.docs.filter(
      (member) => member.data().status === "active",
    );
    const otherAdmins = activeMembers.filter(
      (member) =>
        member.data().userId !== userId && member.data().role === "admin",
    );

    if (otherAdmins.length > 0) continue;

    const otherMembers = activeMembers.filter(
      (member) => member.data().userId !== userId,
    );
    if (otherMembers.length > 0) {
      throw new AccountDeletionError(
        "LAST_ADMIN",
        "You are the only administrator of a family that still has members. Invite one of them as an administrator before deleting your account.",
      );
    }

    soloFamilyIds.push(familyId);
  }

  return { soloFamilyIds };
}

async function commitInChunks(
  operations: Array<
    | { kind: "delete"; ref: DocumentReference }
    | { kind: "removeFields"; ref: DocumentReference; fields: string[] }
  >,
) {
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

async function hardDeleteSoloFamilies(familyIds: string[]) {
  for (const familyId of familyIds) {
    const snapshots = await Promise.all(
      ["entries", "budgetAreas", "categories", "familyMembers", "invites"].map(
        (collectionName) =>
          getDocs(
            query(
              collection(db, collectionName),
              where("familyId", "==", familyId),
            ),
          ),
      ),
    );
    const operations = snapshots.flatMap((snapshot) =>
      snapshot.docs.map((item) => ({
        kind: "delete" as const,
        ref: item.ref,
      })),
    );
    operations.push({
      kind: "delete",
      ref: doc(db, "families", familyId),
    });
    await commitInChunks(operations);
  }
}

async function removePersonalFirestoreData(
  user: User,
  plan: AccountDeletionPlan,
) {
  await hardDeleteSoloFamilies(plan.soloFamilyIds);

  const [
    memberships,
    entries,
    budgetAreas,
    categories,
    createdFamilies,
    deletedFamilies,
    createdInvites,
    acceptedInvites,
    emailInvites,
  ] = await Promise.all([
    getDocs(
      query(collection(db, "familyMembers"), where("userId", "==", user.uid)),
    ),
    getDocs(query(collection(db, "entries"), where("userId", "==", user.uid))),
    getDocs(
      query(collection(db, "budgetAreas"), where("createdBy", "==", user.uid)),
    ),
    getDocs(
      query(collection(db, "categories"), where("createdBy", "==", user.uid)),
    ),
    getDocs(
      query(collection(db, "families"), where("createdBy", "==", user.uid)),
    ),
    getDocs(
      query(collection(db, "families"), where("deletedBy", "==", user.uid)),
    ),
    getDocs(
      query(collection(db, "invites"), where("createdBy", "==", user.uid)),
    ),
    getDocs(
      query(collection(db, "invites"), where("acceptedBy", "==", user.uid)),
    ),
    user.email
      ? getDocs(
          query(
            collection(db, "invites"),
            where("email", "==", user.email.trim().toLowerCase()),
          ),
        )
      : Promise.resolve(null),
  ]);

  const deletes = new Map<string, DocumentReference>();
  memberships.docs.forEach((item) => deletes.set(item.ref.path, item.ref));
  emailInvites?.docs.forEach((item) => deletes.set(item.ref.path, item.ref));

  const removals = new Map<
    string,
    { kind: "removeFields"; ref: DocumentReference; fields: Set<string> }
  >();
  const addRemoval = (ref: DocumentReference, field: string) => {
    if (!deletes.has(ref.path)) {
      const existing = removals.get(ref.path);
      if (existing) {
        existing.fields.add(field);
      } else {
        removals.set(ref.path, {
          kind: "removeFields",
          ref,
          fields: new Set([field]),
        });
      }
    }
  };

  entries.docs.forEach((item) => addRemoval(item.ref, "userId"));
  budgetAreas.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  categories.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  createdFamilies.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  deletedFamilies.docs.forEach((item) => addRemoval(item.ref, "deletedBy"));
  createdInvites.docs.forEach((item) => addRemoval(item.ref, "createdBy"));
  acceptedInvites.docs.forEach((item) => addRemoval(item.ref, "acceptedBy"));

  await commitInChunks([
    ...Array.from(deletes.values(), (ref) => ({
      kind: "delete" as const,
      ref,
    })),
    ...Array.from(removals.values(), (operation) => ({
      ...operation,
      fields: Array.from(operation.fields),
    })),
    { kind: "delete", ref: doc(db, "users", user.uid) },
  ]);
}

async function reauthenticatePasswordUser(user: User, password?: string) {
  if (!password) {
    throw new AccountDeletionError(
      "PASSWORD_REQUIRED",
      "Enter your password to confirm account deletion.",
    );
  }
  if (!user.email) {
    throw new Error("This account does not have an email address.");
  }

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, password),
  );
}

async function reauthenticateGoogleUser(user: User) {
  if (Platform.OS === "web") {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    return;
  }

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error("Google did not return an ID token.");

  await reauthenticateWithCredential(
    user,
    GoogleAuthProvider.credential(idToken),
  );
}

async function reauthenticateAppleUser(user: User) {
  if (Platform.OS === "web") {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    const result = await reauthenticateWithPopup(user, provider);
    const credential = OAuthProvider.credentialFromResult(result);
    return credential?.accessToken;
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const appleResult = await AppleAuthentication.signInAsync({
    nonce: hashedNonce,
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
  });
  if (!appleResult.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }

  const provider = new OAuthProvider("apple.com");
  await reauthenticateWithCredential(
    user,
    provider.credential({
      idToken: appleResult.identityToken,
      rawNonce,
    }),
  );

  // Expo returns an Apple authorization code here, not an OAuth access token.
  // Apple token revocation for native iOS therefore remains a backend release task.
  return undefined;
}

export async function deleteCurrentAccount(password?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("No signed-in account was found.");

  // Check family ownership before asking the user to authenticate again.
  await getDeletionPlan(user.uid);

  const method = getAccountReauthenticationMethod(user);
  if (method === "password") await reauthenticatePasswordUser(user, password);
  if (method === "google") await reauthenticateGoogleUser(user);
  const appleAccessToken =
    method === "apple" ? await reauthenticateAppleUser(user) : undefined;

  // Re-check immediately before deleting in case family membership changed.
  const plan = await getDeletionPlan(user.uid);
  await removePersonalFirestoreData(user, plan);
  if (appleAccessToken) {
    try {
      await revokeAccessToken(auth, appleAccessToken);
    } catch (error) {
      // Account deletion is more important than leaving a partially deleted
      // account. Native Apple revocation is tracked as a separate release gate.
      console.error("Apple token revocation failed:", error);
    }
  }
  await deleteUser(user);
}
