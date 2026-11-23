import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Platform, Pressable, View } from "react-native";
import Text from "../common/AppText";
import type { BudgetArea } from "../../../services/budgetAreas";
import AppTextInput from "../common/AppTextInput";
import PrimaryButton from "../common/PrimaryButton";
import SettingsSheet from "../common/SettingsSheet";
import { uiStyles as s, uiTokens as t } from "../common/dashboardStyles";
type Props = {
  budgetAreas: BudgetArea[];
  newBudgetAreaName: string;
  isAdmin: boolean;
  onNewBudgetAreaNameChange: (v: string) => void;
  onAddBudgetArea: () => Promise<boolean>;
  onArchiveBudgetArea: (id: string) => Promise<void>;
  onSetDefaultBudgetArea: (id: string) => Promise<void>;
  onEditBudgetArea: (id: string, name: string) => Promise<void>;
  selectedAreaId: string;
  onAreaSelect: (id: string) => void;
  categoryCount: number;
  renderCategories: () => React.ReactNode;
};
export default function BudgetAreasSection(p: Props) {
  const [collapsed, setCollapsed] = useState(false),
    [action, setAction] = useState<{
      mode: "add" | "rename" | "manage";
      area?: BudgetArea;
    } | null>(null),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    if (!busy) {
      setAction(null);
      setError("");
    }
  };
  const archive = (id: string) => {
    const execute = () => {
      setBusy(true);
      void p
        .onArchiveBudgetArea(id)
        .then(() => setAction(null))
        .catch(() => setError("Could not archive this area. Please retry."))
        .finally(() => setBusy(false));
    };
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Archive this budget area? Existing entries and reports remain saved.",
        )
      )
        execute();
    } else
      Alert.alert(
        "Archive budget area?",
        "Existing entries and reports remain saved.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: execute },
        ],
      );
  };
  return (
    <View style={s.card}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.heading}>Budget areas</Text>
        {p.isAdmin && (
          <PrimaryButton
            variant="text"
            title="+ Add area"
            onPress={() => {
              setAction({ mode: "add" });
              setDraft("");
              p.onNewBudgetAreaNameChange("");
              setError("");
            }}
          />
        )}
      </View>
      <Text style={s.helper}>
        Premium receipt uploads are needed to require receipts. Existing
        requirements can always be turned off.
      </Text>
      {p.budgetAreas.map((area) => {
        const expanded = area.id === p.selectedAreaId && !collapsed;
        return (
          <View key={area.id}>
            <View style={[s.row, { gap: 4 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Toggle budget area ${area.name}`}
                accessibilityState={{ expanded }}
                style={[s.row, { flex: 1, minWidth: 0, minHeight: 48, gap: 8 }]}
                onPress={() => {
                  if (area.id === p.selectedAreaId) setCollapsed(!collapsed);
                  else {
                    p.onAreaSelect(area.id);
                    setCollapsed(false);
                  }
                }}
              >
                <Ionicons
                  name={expanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color={t.muted}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[s.name, { fontWeight: "600" }]}>
                    {area.name}
                  </Text>
                  <Text style={s.helper}>
                    {expanded
                      ? `${p.categoryCount} categories`
                      : "View categories"}
                  </Text>
                </View>
                {area.isDefault && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>Default</Text>
                  </View>
                )}
              </Pressable>
              {p.isAdmin && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Budget area actions for ${area.name}`}
                  style={{
                    minHeight: 48,
                    minWidth: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    setAction({ mode: "manage", area });
                    setError("");
                  }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={22}
                    color={t.muted}
                  />
                </Pressable>
              )}
            </View>
            {expanded && (
              <View style={{ paddingStart: 4, paddingTop: 8 }}>
                {p.renderCategories()}
              </View>
            )}
            <View style={[s.divider, { marginTop: 8 }]} />
          </View>
        );
      })}
      <SettingsSheet
        visible={action !== null}
        title={
          action?.mode === "manage"
            ? "Manage budget area"
            : action?.mode === "rename"
              ? "Rename budget area"
              : "New budget area"
        }
        subtitle={action?.area?.name}
        onClose={close}
        busy={busy}
      >
        {action?.mode === "manage" ? (
          <>
            <PrimaryButton
              variant="text"
              title="Set as default"
              disabled={busy || action.area?.isDefault}
              onPress={async () => {
                if (!action.area) return;
                setBusy(true);
                try {
                  await p.onSetDefaultBudgetArea(action.area.id);
                  setAction(null);
                } catch {
                  setError("Could not set the default area.");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <PrimaryButton
              variant="text"
              title="Rename"
              onPress={() => {
                setDraft(action.area?.name || "");
                setAction({ ...action, mode: "rename" });
              }}
            />
            <PrimaryButton
              variant="text"
              title="Archive"
              disabled={busy}
              onPress={() => {
                if (action.area) archive(action.area.id);
              }}
            />
          </>
        ) : (
          <>
            <Text style={s.body}>Area name</Text>
            <AppTextInput
              style={{ marginBottom: 0 }}
              accessibilityLabel="Area name"
              placeholder="Area name"
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setError("");
                if (action?.mode === "add") p.onNewBudgetAreaNameChange(value);
              }}
              autoFocus
            />
            {error ? (
              <Text accessibilityRole="alert" style={{ color: t.danger }}>
                {error}
              </Text>
            ) : null}
            <PrimaryButton
              title={action?.mode === "rename" ? "Save changes" : "Add area"}
              loading={busy}
              onPress={async () => {
                if (busy) return;
                if (!draft.trim()) {
                  setError("Enter an area name.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  if (action?.mode === "rename" && action.area) {
                    await p.onEditBudgetArea(action.area.id, draft);
                    setAction(null);
                  } else if (await p.onAddBudgetArea()) setAction(null);
                } catch {
                  setError("Could not save the area. Please retry.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          </>
        )}
        {action?.mode === "manage" && error ? (
          <Text accessibilityRole="alert" style={{ color: t.danger }}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          variant="text"
          title="Cancel"
          disabled={busy}
          onPress={close}
        />
      </SettingsSheet>
    </View>
  );
}
