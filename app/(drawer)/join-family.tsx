import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../services/auth";
import {
  deleteFamily,
  exportFamilyEntries,
  FamilyActionError,
  getFamilyBudgetAreas,
  getFamilyContext,
  joinFamilyWithCode,
  type ExportBudgetArea,
  type FamilyContext,
} from "../../services/families";
import AppScreen from "../components/common/AppScreen";
import AppTextInput from "../components/common/AppTextInput";
import LoadingSpinner from "../components/common/LoadingSpinner";
import PrimaryButton from "../components/common/PrimaryButton";

export default function JoinFamilyScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [context, setContext] = useState<FamilyContext | null>(null);
  const [budgetAreas, setBudgetAreas] = useState<ExportBudgetArea[]>([]);
  const [selectedAreaIds, setSelectedAreaIds] = useState<string[]>([]);

  const loadContext = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const nextContext = await getFamilyContext(user.uid);
      setContext(nextContext);

      if (nextContext?.role === "admin" && nextContext.activeAdminCount <= 1) {
        const areas = await getFamilyBudgetAreas(nextContext.familyId);
        setBudgetAreas(areas);
        setSelectedAreaIds(areas.map((area) => area.id));
      } else {
        setBudgetAreas([]);
        setSelectedAreaIds([]);
      }
    } catch (error) {
      console.error("Failed to load family information:", error);
      setMessage("We could not load your family information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void loadContext();
    }, [loadContext]),
  );

  const handleJoinFamily = async () => {
    const user = auth.currentUser;
    if (!user?.email || code.length !== 6) return;

    setWorking(true);
    setMessage("");
    try {
      await joinFamilyWithCode(user.uid, user.email, code);
      setCode("");
      router.replace("/(drawer)/dashboard");
    } catch (error) {
      setMessage(
        error instanceof FamilyActionError
          ? error.message
          : "We could not switch families. Please try again.",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleExport = async (selectedOnly: boolean) => {
    if (!context) return;
    if (selectedOnly && selectedAreaIds.length === 0) {
      setMessage("Select at least one budget area to export.");
      return;
    }

    setWorking(true);
    setMessage("");
    try {
      const count = await exportFamilyEntries(
        context.familyId,
        context.familyName,
        selectedOnly ? selectedAreaIds : undefined,
      );
      setMessage(
        count === 1
          ? "Exported 1 entry."
          : `Exported ${count} entries.`,
      );
    } catch (error) {
      console.error("Family export failed:", error);
      setMessage("The export could not be created. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const performDelete = async () => {
    const user = auth.currentUser;
    if (!user || !context) return;

    setWorking(true);
    setMessage("");
    try {
      await deleteFamily(context.familyId, user.uid);
      router.replace("/family-setup");
    } catch (error) {
      console.error("Family deletion failed:", error);
      setMessage("The family could not be deleted. Please try again.");
      setWorking(false);
    }
  };

  const confirmDelete = () => {
    const warning =
      `Delete “${context?.familyName}”? This closes the family for every member. ` +
      "Export anything you want to keep before continuing.";

    if (Platform.OS === "web") {
      if (window.confirm(warning)) void performDelete();
      return;
    }

    Alert.alert("Delete family?", warning, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Family",
        style: "destructive",
        onPress: () => void performDelete(),
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner message="Loading family information..." />;
  }

  const isLastAdmin =
    context?.role === "admin" && context.activeAdminCount <= 1;

  return (
    <AppScreen style={styles.screen}>
      <Text style={styles.title}>
        {isLastAdmin ? "Before You Leave" : "Switch Family"}
      </Text>

      {isLastAdmin ? (
        <>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              You are the only administrator
            </Text>
            <Text style={styles.body}>
              You cannot enter an invite code or leave “{context.familyName}”
              until another active administrator is added. You can invite
              another administrator, or export your records and delete this
              family.
            </Text>
          </View>

          <PrimaryButton
            title="Invite Another Administrator"
            onPress={() => router.push("/(drawer)/invite-family")}
          />

          <Text style={styles.sectionTitle}>Export before deleting</Text>
          <Text style={styles.body}>
            Choose the budget areas you want in a CSV export. Entries remain
            unchanged until you confirm family deletion.
          </Text>

          {budgetAreas.map((area) => {
            const selected = selectedAreaIds.includes(area.id);
            return (
              <TouchableOpacity
                key={area.id}
                style={styles.areaRow}
                onPress={() =>
                  setSelectedAreaIds((current) =>
                    selected
                      ? current.filter((id) => id !== area.id)
                      : [...current, area.id],
                  )
                }
              >
                <View style={[styles.checkbox, selected && styles.checkedBox]}>
                  {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.areaName}>{area.name}</Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.buttonGap}>
            <PrimaryButton
              title="Export Selected Budget Areas"
              onPress={() => void handleExport(true)}
              disabled={selectedAreaIds.length === 0}
              loading={working}
            />
          </View>
          <View style={styles.buttonGap}>
            <PrimaryButton
              title="Export All Entries"
              onPress={() => void handleExport(false)}
              loading={working}
            />
          </View>

          <TouchableOpacity
            style={[styles.deleteButton, working && styles.disabled]}
            onPress={confirmDelete}
            disabled={working}
          >
            <Text style={styles.deleteText}>Delete Current Family</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.body}>
            Enter the six-digit invitation code for the family you want to
            join. You will leave your current family after the code is
            accepted.
          </Text>
          <Text style={styles.label}>Invitation code</Text>
          <AppTextInput
            value={code}
            onChangeText={(text) =>
              setCode(text.replace(/[^0-9]/g, "").slice(0, 6))
            }
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
          />
          <PrimaryButton
            title="Switch Family"
            onPress={() => void handleJoinFamily()}
            disabled={code.length !== 6}
            loading={working}
          />
        </>
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 56 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  body: { color: "#4B5563", fontSize: 16, lineHeight: 24, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  warningCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FB923C",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warningTitle: {
    color: "#9A3412",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginTop: 32, marginBottom: 8 },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkedBox: { backgroundColor: "#2BCEA6", borderColor: "#2BCEA6" },
  checkmark: { color: "#FFFFFF", fontWeight: "700" },
  areaName: { fontSize: 16, color: "#111827" },
  buttonGap: { marginTop: 12 },
  deleteButton: {
    borderColor: "#DC2626",
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  deleteText: { color: "#DC2626", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.5 },
  message: {
    color: "#374151",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 20,
  },
});
