import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useBudgetAreas } from "../../hooks/useBudgetAreas";
import { auth, db } from "../../services/auth";
import {
  addBudgetArea,
  archiveBudgetArea,
  getBudgetAreas,
  setDefaultBudgetArea,
  updateBudgetAreaName,
} from "../../services/budgetAreas";
import {
  addCategory,
  archiveCategory,
  getCategories,
  setDefaultCategory,
  updateCategory,
  type Category,
  type CategoryType,
} from "../../services/categories";
import { getFamilyAdmins, type FamilyAdmin } from "../../services/families";
import {
  deleteCurrentAccount,
  getAccountReauthenticationMethod,
} from "../../services/accountDeletion";
import AppScreen from "../components/common/AppScreen";
import LoadingSpinner from "../components/common/LoadingSpinner";
import PrimaryButton from "../components/common/PrimaryButton";
import BudgetAreasSection from "../components/settings/BudgetAreasSection";
import CategoriesSection from "../components/settings/CategoriesSection";
import FamilyBudgetSection from "../components/settings/FamilyBudgetSection";
import AdminsSection from "../components/settings/AdminsSection";
import AccountSection from "../components/settings/AccountSection";

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [dailyBudget, setDailyBudget] = useState(0);
  const [familyName, setFamilyName] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [admins, setAdmins] = useState<FamilyAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { budgetAreas, setBudgetAreas, refreshBudgetAreas } = useBudgetAreas(
    familyId ?? "",
  );
  const [inviteEmail, setInviteEmail] = useState("");
  const [newBudgetAreaName, setNewBudgetAreaName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryBudgetAreaId, setSelectedCategoryBudgetAreaId] =
    useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] =
    useState<CategoryType>("expense");

  const handleSetDefaultBudgetArea = async (budgetAreaId: string) => {
    if (!isAdmin || !familyId) return;

    await setDefaultBudgetArea(familyId, budgetAreaId);

    // IMPORTANT UX RULE:
    // Do NOT call refreshBudgetAreas() here.
    // Refreshing from Firestore may reorder the list and move the default budget area
    // to the top, which feels like the item "jumps" and confuses users.
    // Instead, update only the isDefault flag locally and preserve the current order.
    setBudgetAreas((currentAreas) =>
      currentAreas.map((area) => ({
        ...area,
        isDefault: area.id === budgetAreaId,
      })),
    );
  };
  const handleSetDefaultCategory = async (categoryId: string) => {
    if (!isAdmin || !familyId || !selectedCategoryBudgetAreaId) return;

    try {
      await setDefaultCategory(
        familyId,
        selectedCategoryBudgetAreaId,
        categoryId,
      );

      setCategories((currentCategories) =>
        currentCategories.map((category) => ({
          ...category,
          isDefault: category.id === categoryId,
        })),
      );
    } catch (error) {
      console.error("Failed to set default category:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // 🔹 1. Get user's account
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const famId = userData.activeFamilyId;
      if (!famId) {
        setLoading(false);
        return;
      }

      setFamilyId(famId);
      setIsAdmin(userData.role === "admin");

      // 🔹 2. Get account data
      const accountRef = doc(db, "families", famId);
      const accountSnap = await getDoc(accountRef);

      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        setFamilyName(accountData.name || "Family");
        setDailyBudget(accountData.dailyBudget);
      }

      const areas = await getBudgetAreas(famId);
      if (areas.length > 0) {
        setSelectedCategoryBudgetAreaId(areas[0].id);

        const loadedCategories = await getCategories(famId, areas[0].id);
        setCategories(loadedCategories);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      if (!familyId || !selectedCategoryBudgetAreaId) return;

      const loadedCategories = await getCategories(
        familyId,
        selectedCategoryBudgetAreaId,
      );

      setCategories(loadedCategories);
    };

    loadCategories();
  }, [familyId, selectedCategoryBudgetAreaId]);

  useEffect(() => {
    const loadAdmins = async () => {
      const user = auth.currentUser;
      if (!familyId || !user) {
        setAdmins([]);
        return;
      }

      setAdminsLoading(true);
      try {
        setAdmins(await getFamilyAdmins(familyId, user.uid, user.email));
      } catch (error) {
        console.error("Failed to load family administrators:", error);
        setAdmins([]);
      } finally {
        setAdminsLoading(false);
      }
    };

    void loadAdmins();
  }, [familyId]);

  const handleSwitchUser = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google sign-out skipped:", error);
    }

    await signOut(auth);

    router.replace("/login");
  };

  const handleDeleteAccount = async (password?: string) => {
    await deleteCurrentAccount(password);

    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google sign-out skipped after account deletion:", error);
    }

    router.replace("/login");
  };

  const handleUpdateBudget = async () => {
    if (!isAdmin || !familyId) return;

    const newBudget = Number(budgetInput);

    if (!newBudget || newBudget <= 0) return;

    const docRef = doc(db, "families", familyId);

    await updateDoc(docRef, {
      dailyBudget: newBudget,
    });

    setDailyBudget(newBudget);
    setBudgetInput("");
  };

  const handleInviteMember = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return;

    const email = inviteEmail.trim().toLowerCase();

    if (!email) return;

    await addDoc(collection(db, "invites"), {
      email,
      familyId,
      role: "member",
      createdBy: auth.currentUser.uid,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    setInviteEmail("");
  };

  const handleAddBudgetArea = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return;

    const name = newBudgetAreaName.trim();

    if (!name) return;

    await addBudgetArea(familyId, auth.currentUser.uid, name);

    await refreshBudgetAreas();
    setNewBudgetAreaName("");
  };

  const handleArchiveBudgetArea = async (budgetAreaId: string) => {
    if (!isAdmin || !familyId) return;

    await archiveBudgetArea(familyId, budgetAreaId);

    await refreshBudgetAreas();
  };

  const handleEditBudgetArea = async (
    budgetAreaId: string,
    currentName: string,
  ) => {
    const newName = window.prompt("Edit budget area name", currentName);

    if (!newName || newName.trim() === "") return;

    await updateBudgetAreaName(budgetAreaId, newName.trim());

    await refreshBudgetAreas();
  };

  const handleAddCategory = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return;

    const name = newCategoryName.trim();

    if (!name || !selectedCategoryBudgetAreaId) return;

    const addedCategory = await addCategory(
      familyId,
      auth.currentUser.uid,
      selectedCategoryBudgetAreaId,
      name,
      newCategoryType,
    );

    setCategories((currentCategories) =>
      [...currentCategories, addedCategory].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );

    setNewCategoryName("");
    setNewCategoryType("expense");
  };

  const handleArchiveCategory = async (categoryId: string) => {
    if (!isAdmin || !familyId || !selectedCategoryBudgetAreaId) return;

    await archiveCategory(categoryId);

    const loadedCategories = await getCategories(
      familyId,
      selectedCategoryBudgetAreaId,
    );

    setCategories(loadedCategories);
  };

  const handleEditCategory = async (
    categoryId: string,
    currentName: string,
    currentType: CategoryType,
  ) => {
    const newName = window.prompt("Edit category name", currentName);

    if (!newName || newName.trim() === "") return;

    const typeInput = window.prompt(
      "Category type: expense, income, refund, cashback",
      currentType,
    );

    if (
      !typeInput ||
      !["expense", "income", "refund", "cashback"].includes(typeInput)
    ) {
      return;
    }

    await updateCategory(categoryId, newName.trim(), typeInput as CategoryType);

    const loadedCategories = await getCategories(
      familyId!,
      selectedCategoryBudgetAreaId,
    );

    setCategories(loadedCategories);
  };
  if (loading) {
    return <LoadingSpinner message="Loading family settings..." />;
  }
  return (
    <AppScreen style={{ paddingTop: 80 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: "#087F65",
          marginBottom: 2,
        }}
      >
        {familyName || "Family"} Family
      </Text>
      <Text style={{ fontSize: 30, fontWeight: "700", marginBottom: 20 }}>
        Settings
      </Text>

      <FamilyBudgetSection
        dailyBudget={dailyBudget}
        budgetInput={budgetInput}
        isAdmin={isAdmin}
        onBudgetInputChange={setBudgetInput}
        onUpdateBudget={handleUpdateBudget}
      />

      <AdminsSection admins={admins} loading={adminsLoading} />

      <BudgetAreasSection
        budgetAreas={budgetAreas}
        newBudgetAreaName={newBudgetAreaName}
        isAdmin={isAdmin}
        onNewBudgetAreaNameChange={setNewBudgetAreaName}
        onAddBudgetArea={handleAddBudgetArea}
        onArchiveBudgetArea={handleArchiveBudgetArea}
        onEditBudgetArea={handleEditBudgetArea}
        onSetDefaultBudgetArea={handleSetDefaultBudgetArea}
      />

      <CategoriesSection
        budgetAreas={budgetAreas}
        categories={categories}
        selectedBudgetAreaId={selectedCategoryBudgetAreaId}
        newCategoryName={newCategoryName}
        newCategoryType={newCategoryType}
        isAdmin={isAdmin}
        onSelectedBudgetAreaIdChange={setSelectedCategoryBudgetAreaId}
        onNewCategoryNameChange={setNewCategoryName}
        onNewCategoryTypeChange={setNewCategoryType}
        onAddCategory={handleAddCategory}
        onArchiveCategory={handleArchiveCategory}
        onEditCategory={handleEditCategory}
        onSetDefaultCategory={handleSetDefaultCategory}
      />

      <View style={{ marginTop: 24 }}>
        <PrimaryButton title="Switch User" onPress={handleSwitchUser} />
      </View>

      {auth.currentUser ? (
        <AccountSection
          reauthenticationMethod={getAccountReauthenticationMethod(
            auth.currentUser,
          )}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}
    </AppScreen>
  );
}
