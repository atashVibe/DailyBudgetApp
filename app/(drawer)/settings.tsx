import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter, useFocusEffect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocFromServer, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { getReceiptAccess } from "../../services/receipts";
import { View, Pressable } from "react-native";
import Text from "../components/common/AppText";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  uiStyles as ui,
  uiTokens as tokens,
} from "../components/common/dashboardStyles";
import PrimaryButton from "../components/common/PrimaryButton";
import SettingsSheet from "../components/common/SettingsSheet";
import Toast from "../components/common/Toast";
import { useRequestSignOut } from "../../components/SignOutConfirmation";
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
  setCategoryReceiptRequired,
  type Category,
  type CategoryType,
} from "../../services/categories";
import { getFamilyAdmins, type FamilyAdmin } from "../../services/families";
import {
  deleteCurrentAccount,
  prepareAccountDeletion,
  getAccountReauthenticationMethod,
} from "../../services/accountDeletion";
import AppScreen from "../components/common/AppScreen";
import LoadingSpinner from "../components/common/LoadingSpinner";
import BudgetAreasSection from "../components/settings/BudgetAreasSection";
import CategoriesSection from "../components/settings/CategoriesSection";
import FamilyBudgetSection from "../components/settings/FamilyBudgetSection";
import AdminsSection from "../components/settings/AdminsSection";
import AccountSection from "../components/settings/AccountSection";
import LeaveFamilySection from "../components/settings/LeaveFamilySection";
import ProfileNameSection from "../components/settings/ProfileNameSection";
import { saveUserDisplayName } from "../../services/profile";
import PolicyLinks from "../../components/PolicyLinks";
import { withTimeout } from "../../services/loading";

export default function SettingsScreen({
  accountOnly = false,
}: { accountOnly?: boolean } = {}) {
  const requestSignOut = useRequestSignOut();
  const [nameDialog, setNameDialog] = useState(false);
  const [profileBeforeEdit, setProfileBeforeEdit] = useState("");
  const [toast, setToast] = useState("");
  const dismissToast = useCallback(() => setToast(""), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const router = useRouter();
  const [dailyBudget, setDailyBudget] = useState(0);
  const [familyName, setFamilyName] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [admins, setAdmins] = useState<FamilyAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { budgetAreas, setBudgetAreas, refreshBudgetAreas } = useBudgetAreas(
    familyId ?? "",
  );
  const [newBudgetAreaName, setNewBudgetAreaName] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryBudgetAreaId, setSelectedCategoryBudgetAreaId] =
    useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] =
    useState<CategoryType>("expense");

  const [newCategoryRequiresReceipt, setNewCategoryRequiresReceipt] =
    useState(false);
  const [categoryMessage, setCategoryMessage] = useState("");
  const [canRequireReceipts, setCanRequireReceipts] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setCanRequireReceipts(false);
      if (familyId && !accountOnly)
        getReceiptAccess()
          .then((access) => {
            if (current)
              setCanRequireReceipts(
                access.familyId === familyId && access.canUpload,
              );
          })
          .catch(() => {
            if (current) setCanRequireReceipts(false);
          });
      return () => {
        current = false;
      };
    }, [familyId, accountOnly]),
  );
  useEffect(() => {
    if (!canRequireReceipts) setNewCategoryRequiresReceipt(false);
  }, [canRequireReceipts]);
  const handleReceiptRequiredChange = async (
    categoryId: string,
    required: boolean,
  ) => {
    if (!isAdmin || !familyId) return false;
    if (required && !canRequireReceipts) {
      setCategoryMessage(
        "Your family needs Premium receipt upload access before receipts can be required.",
      );
      return false;
    }
    setCategoryMessage("");
    const previous =
      categories.find((category) => category.id === categoryId)
        ?.requiresReceipt === true;
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, requiresReceipt: required }
          : category,
      ),
    );
    try {
      await setCategoryReceiptRequired(categoryId, required, familyId);
      setCategoryMessage("");
      setToast("Saved");
      return true;
    } catch {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId
            ? { ...category, requiresReceipt: previous }
            : category,
        ),
      );
      setCategoryMessage(
        "Could not update the receipt requirement. Please retry.",
      );
      return false;
    }
  };

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
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setLoadError(false);
      if (!user) {
        setLoading(false);
        return;
      }

      // 🔹 1. Get user's account
      const userRef = doc(db, "users", user.uid);
      let userSnap;
      try {
        userSnap = await withTimeout(
          accountOnly ? getDocFromServer(userRef) : getDoc(userRef),
          15000,
        );
      } catch {
        if (auth.currentUser?.uid === user.uid) {
          setLoadError(true);
          setLoading(false);
        }
        return;
      }

      if (auth.currentUser?.uid !== user.uid) return;
      if (accountOnly) {
        setFamilyId(userSnap.data()?.activeFamilyId || null);
        setProfileName(user.displayName || userSnap.data()?.displayName || "");
        setLoading(false);
        return;
      }

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

      const accountRef = doc(db, "families", famId);
      const [accountSnap, membershipSnap] = await Promise.all([
        getDoc(accountRef),
        getDoc(doc(db, "familyMembers", `${famId}_${user.uid}`)),
      ]);

      setIsAdmin(
        membershipSnap.exists() &&
          membershipSnap.data().status === "active" &&
          membershipSnap.data().role === "admin",
      );
      setProfileName(
        membershipSnap.data()?.displayName || user.displayName || "",
      );

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
  }, [accountOnly, loadAttempt]);

  useEffect(() => {
    const loadCategories = async () => {
      if (accountOnly || !familyId || !selectedCategoryBudgetAreaId) return;

      const loadedCategories = await getCategories(
        familyId,
        selectedCategoryBudgetAreaId,
      );

      setCategories(loadedCategories);
    };

    loadCategories();
  }, [familyId, selectedCategoryBudgetAreaId, accountOnly]);

  useEffect(() => {
    const loadAdmins = async () => {
      const user = auth.currentUser;
      if (accountOnly || !familyId || !user) {
        setAdmins([]);
        return;
      }

      setAdminsLoading(true);
      try {
        setAdmins(
          await getFamilyAdmins(
            familyId,
            user.uid,
            user.email,
            user.displayName,
          ),
        );
      } catch (error) {
        console.error("Failed to load family administrators:", error);
        setAdmins([]);
      } finally {
        setAdminsLoading(false);
      }
    };

    void loadAdmins();
  }, [familyId, accountOnly]);

  const handleSaveProfileName = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setProfileMessage("");
    try {
      const savedName = await saveUserDisplayName(user, familyId, profileName);
      setProfileName(savedName);
      setProfileBeforeEdit(savedName);
      setAdmins((currentAdmins) =>
        currentAdmins.map((admin) =>
          admin.isCurrentUser ? { ...admin, name: savedName } : admin,
        ),
      );
      setProfileMessage("Name saved");
      setToast("Name saved");
    } catch (error) {
      console.error("Failed to save profile name:", error);
      setProfileMessage("The name could not be saved. Please try again.");
    }
  };

  const handleDeleteAccount = async (
    password: string | undefined,
    expectedUserId: string,
  ) => {
    await deleteCurrentAccount(password, expectedUserId);

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

  const handleAddBudgetArea = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return false;

    const name = newBudgetAreaName.trim();

    if (!name) return false;

    await addBudgetArea(familyId, auth.currentUser.uid, name);

    await refreshBudgetAreas();
    setNewBudgetAreaName("");
    setToast("Area added");
    return true;
  };

  const handleArchiveBudgetArea = async (budgetAreaId: string) => {
    if (!isAdmin || !familyId) return;

    await archiveBudgetArea(familyId, budgetAreaId);

    await refreshBudgetAreas();
  };

  const handleEditBudgetArea = async (
    budgetAreaId: string,
    newName: string,
  ) => {
    if (!isAdmin || !familyId || !newName.trim()) return;
    await updateBudgetAreaName(budgetAreaId, newName.trim());
    await refreshBudgetAreas();
    setToast("Area updated");
  };

  const handleAddCategory = async () => {
    if (!isAdmin || !familyId || !auth.currentUser) return false;

    const name = newCategoryName.trim();

    if (!name || !selectedCategoryBudgetAreaId) return false;

    if (newCategoryRequiresReceipt && !canRequireReceipts) {
      setCategoryMessage(
        "Your family needs Premium receipt upload access before receipts can be required.",
      );
      return false;
    }
    let addedCategory: Category;
    try {
      addedCategory = await addCategory(
        familyId,
        auth.currentUser.uid,
        selectedCategoryBudgetAreaId,
        name,
        newCategoryType,
        newCategoryRequiresReceipt,
      );
    } catch (error) {
      setCategoryMessage(
        error instanceof Error
          ? error.message
          : "Could not add the category. Please retry.",
      );
      return false;
    }

    setCategories((currentCategories) =>
      [...currentCategories, addedCategory].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );

    setNewCategoryName("");
    setNewCategoryType("expense");
    setNewCategoryRequiresReceipt(false);
    setToast("Category added");
    return true;
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
    newName: string,
    type: CategoryType,
  ) => {
    if (
      !isAdmin ||
      !familyId ||
      !selectedCategoryBudgetAreaId ||
      !newName.trim()
    )
      return false;
    await updateCategory(categoryId, newName.trim(), type);
    const loadedCategories = await getCategories(
      familyId,
      selectedCategoryBudgetAreaId,
    );
    setCategories(loadedCategories);
    setToast("Category updated");
    return true;
  };
  if (loading) {
    return <LoadingSpinner message="Loading family settings..." />;
  }
  const profile = (
    <ProfileNameSection
      name={profileName}
      message={profileMessage}
      onNameChange={(value) => {
        setProfileMessage("");
        setProfileName(value);
      }}
      onSave={handleSaveProfileName}
    />
  );
  if (loadError)
    return (
      <AppScreen>
        <View style={ui.card}>
          <Text style={ui.body}>
            Your account could not be loaded. Check your connection and try
            again.
          </Text>
          <PrimaryButton
            title="Retry loading"
            onPress={() => setLoadAttempt((value) => value + 1)}
          />
        </View>
      </AppScreen>
    );
  if (accountOnly)
    return (
      <View style={{ flex: 1 }}>
        <AppScreen>
          <Text style={ui.pageTitle}>Account</Text>
          <View style={ui.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit your name"
              onPress={() => {
                const name = auth.currentUser?.displayName || profileName;
                setProfileName(name);
                setProfileBeforeEdit(name);
                setProfileMessage("");
                setNameDialog(true);
              }}
              style={[ui.row, { minHeight: 48 }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={ui.body}>Your name</Text>
                <Text style={ui.name}>
                  {profileName ||
                    auth.currentUser?.displayName ||
                    "Add your name"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={tokens.muted} />
            </Pressable>
            <View style={ui.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={requestSignOut}
              style={[ui.row, { minHeight: 48 }]}
            >
              <Ionicons name="log-out-outline" size={20} color={tokens.muted} />
              <Text style={ui.body}>Sign out</Text>
            </Pressable>
          </View>
          {familyId ? (
            <LeaveFamilySection />
          ) : (
            <View style={ui.card}>
              <Text style={ui.heading}>No current family</Text>
              <PrimaryButton
                title="Start or join a family"
                variant="outline"
                onPress={() => router.replace("/family-setup")}
              />
            </View>
          )}
          {auth.currentUser && (
            <AccountSection
              key={auth.currentUser.uid}
              accountId={auth.currentUser.uid}
              reauthenticationMethod={getAccountReauthenticationMethod(
                auth.currentUser,
              )}
              onDeleteAccount={handleDeleteAccount}
              onPrepareAccount={prepareAccountDeletion}
            />
          )}
          <PolicyLinks />
          <SettingsSheet
            visible={nameDialog}
            title="Your name"
            onClose={() => {
              setProfileName(profileBeforeEdit);
              setProfileMessage("");
              setNameDialog(false);
            }}
          >
            {profile}
            <PrimaryButton
              variant="text"
              title="Done"
              onPress={() => {
                setProfileName(profileBeforeEdit);
                setProfileMessage("");
                setNameDialog(false);
              }}
            />
          </SettingsSheet>
        </AppScreen>
        <Toast message={toast} onDismiss={dismissToast} />
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      <AppScreen>
        <Text
          style={[ui.helper, { marginBottom: 4, writingDirection: "auto" }]}
        >
          {familyName || "Family"}
        </Text>
        <Text style={ui.pageTitle}>Family settings</Text>
        <FamilyBudgetSection
          dailyBudget={dailyBudget}
          budgetInput={budgetInput}
          isAdmin={isAdmin}
          onBudgetInputChange={setBudgetInput}
          onUpdateBudget={handleUpdateBudget}
          onSaved={() => setToast("Budget updated")}
        />
        {profile}
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
          selectedAreaId={selectedCategoryBudgetAreaId}
          onAreaSelect={setSelectedCategoryBudgetAreaId}
          categoryCount={
            categories.filter(
              (c) => c.budgetAreaId === selectedCategoryBudgetAreaId,
            ).length
          }
          renderCategories={() => (
            <CategoriesSection
              budgetAreas={budgetAreas}
              categories={categories}
              selectedBudgetAreaId={selectedCategoryBudgetAreaId}
              newCategoryName={newCategoryName}
              newCategoryType={newCategoryType}
              isAdmin={isAdmin}
              canRequireReceipts={canRequireReceipts}
              onSelectedBudgetAreaIdChange={setSelectedCategoryBudgetAreaId}
              onNewCategoryNameChange={setNewCategoryName}
              onNewCategoryTypeChange={setNewCategoryType}
              newCategoryRequiresReceipt={newCategoryRequiresReceipt}
              onNewCategoryRequiresReceiptChange={setNewCategoryRequiresReceipt}
              onReceiptRequiredChange={handleReceiptRequiredChange}
              onAddCategory={handleAddCategory}
              onArchiveCategory={handleArchiveCategory}
              onEditCategory={handleEditCategory}
              onSetDefaultCategory={handleSetDefaultCategory}
              onSaved={() => setToast("Saved")}
            />
          )}
        />
        {categoryMessage ? (
          <Text
            accessibilityRole="alert"
            style={[ui.helper, { color: tokens.danger }]}
          >
            {categoryMessage}
          </Text>
        ) : null}
        <PolicyLinks />
      </AppScreen>
      <Toast message={toast} onDismiss={dismissToast} />
    </View>
  );
}
