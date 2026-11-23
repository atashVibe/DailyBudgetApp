import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Platform, Pressable, View, Switch } from "react-native";
import Text from "../common/AppText";
import CategoryIconLibrary from "../../../components/CategoryIconLibrary";
import {
  updateCategoryIcon,
  type Category,
  type CategoryType,
} from "../../../services/categories";
import type { BudgetArea } from "../../../services/budgetAreas";
import PrimaryButton from "../common/PrimaryButton";
import AppTextInput from "../common/AppTextInput";
import SettingsSheet from "../common/SettingsSheet";
import { uiStyles as s, uiTokens as t } from "../common/dashboardStyles";
type Props = {
  budgetAreas: BudgetArea[];
  categories: Category[];
  selectedBudgetAreaId: string;
  newCategoryName: string;
  newCategoryType: CategoryType;
  newCategoryRequiresReceipt: boolean;
  isAdmin: boolean;
  canRequireReceipts: boolean;
  onNewCategoryRequiresReceiptChange: (v: boolean) => void;
  onReceiptRequiredChange: (id: string, v: boolean) => Promise<boolean>;
  onSelectedBudgetAreaIdChange: (id: string) => void;
  onNewCategoryNameChange: (v: string) => void;
  onNewCategoryTypeChange: (v: CategoryType) => void;
  onAddCategory: () => Promise<boolean>;
  onArchiveCategory: (id: string) => Promise<void>;
  onEditCategory: (
    id: string,
    name: string,
    type: CategoryType,
  ) => Promise<boolean>;
  onSetDefaultCategory: (id: string) => Promise<void>;
  onSaved?: () => void;
};
const types: CategoryType[] = ["income", "expense", "refund", "cashback"];
export default function CategoriesSection(p: Props) {
  const [action, setAction] = useState<{
      mode: "manage" | "form";
      category?: Category;
    } | null>(null),
    [draftName, setDraftName] = useState(""),
    [draftType, setDraftType] = useState<CategoryType>("expense"),
    [required, setRequired] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toggleBusy, setToggleBusy] = useState<string | null>(null),
    [iconCategory, setIconCategory] = useState<string | null>(null),
    [chosenIcons, setChosenIcons] = useState<Record<string, string>>({});
  const categories = p.categories.filter(
      (c) => c.budgetAreaId === p.selectedBudgetAreaId,
    ),
    area = p.budgetAreas.find((a) => a.id === p.selectedBudgetAreaId);
  const close = () => {
    if (!busy) {
      setAction(null);
      setError("");
    }
  };
  const form = (category?: Category) => {
    setAction({ mode: "form", category });
    setError("");
    setDraftName(category?.name || "");
    setDraftType(category?.type || "expense");
    setRequired(category?.requiresReceipt === true);
    if (!category) {
      p.onNewCategoryNameChange("");
      p.onNewCategoryTypeChange("expense");
      p.onNewCategoryRequiresReceiptChange(false);
    }
  };
  const archive = (category: Category) => {
    const execute = () => {
      setBusy(true);
      void p
        .onArchiveCategory(category.id)
        .then(() => setAction(null))
        .catch(() => setError("Could not archive this category."))
        .finally(() => setBusy(false));
    };
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Archive this category? Existing entries and reports remain saved.",
        )
      )
        execute();
    } else
      Alert.alert(
        "Archive category?",
        "Existing entries and reports remain saved.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Archive", style: "destructive", onPress: execute },
        ],
      );
  };
  const save = async () => {
    if (busy) return;
    const name = draftName.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    if (
      categories.some(
        (c) =>
          c.id !== action?.category?.id &&
          c.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setError("A category with this name already exists in this area.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (action?.category) {
        if (!(await p.onEditCategory(action.category.id, name, draftType))) {
          setError("Could not save this category. Please retry.");
          return;
        }
        if (
          required !== (action.category.requiresReceipt === true) &&
          !(await p.onReceiptRequiredChange(action.category.id, required))
        ) {
          setError(
            "The name was saved, but the receipt setting could not be changed. Please retry.",
          );
          return;
        }
        setAction(null);
      } else if (await p.onAddCategory()) setAction(null);
      else setError("Could not add this category. Please retry.");
    } catch {
      setError("Could not save this category. Please retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 4 }}>
      <Text style={[s.helper, { textAlign: "right", paddingEnd: 44 }]}>
        Receipt required
      </Text>
      <CategoryIconLibrary
        visible={iconCategory !== null}
        onClose={() => setIconCategory(null)}
        onChoose={async (name) => {
          if (!p.isAdmin || !iconCategory) return;
          await updateCategoryIcon(iconCategory, name);
          setChosenIcons((current) => ({ ...current, [iconCategory]: name }));
          p.onSaved?.();
        }}
      />
      {categories.map((category) => (
        <View
          key={category.id}
          style={[
            s.row,
            {
              minHeight: 64,
              gap: 8,
              borderBottomWidth: 1,
              borderBottomColor: t.border,
              paddingVertical: 4,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Change icon for ${category.name}`}
            disabled={!p.isAdmin}
            style={s.iconTile}
            onPress={() => setIconCategory(category.id)}
          >
            <Ionicons
              name={
                (chosenIcons[category.id] ||
                  category.iconName ||
                  "pricetag-outline") as React.ComponentProps<
                  typeof Ionicons
                >["name"]
              }
              size={24}
              color={t.tealText}
            />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.name}>{category.name}</Text>
            <Text style={s.helper}>
              {category.type.charAt(0).toUpperCase() + category.type.slice(1)}
              {category.isDefault ? " · Default" : ""}
            </Text>
          </View>
          <View
            style={{
              minWidth: 48,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Switch
              accessibilityLabel={`Require receipt for ${category.name}`}
              disabled={
                !p.isAdmin ||
                toggleBusy === category.id ||
                (!p.canRequireReceipts && category.requiresReceipt !== true)
              }
              value={category.requiresReceipt === true}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              onValueChange={async (value) => {
                setToggleBusy(category.id);
                try {
                  await p.onReceiptRequiredChange(category.id, value);
                } finally {
                  setToggleBusy(null);
                }
              }}
              trackColor={{ false: t.border, true: t.pressed }}
              thumbColor="white"
            />
          </View>
          {p.isAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Category actions for ${category.name}`}
              style={{
                width: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setAction({ mode: "manage", category });
                setError("");
              }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={t.muted} />
            </Pressable>
          )}
        </View>
      ))}
      {!categories.length && (
        <Text style={[s.helper, { paddingVertical: 12 }]}>
          No categories in this area yet.
        </Text>
      )}
      {p.isAdmin && (
        <PrimaryButton
          variant="text"
          title={`+ Add category to ${area?.name || "this area"}`}
          onPress={() => form()}
        />
      )}
      <SettingsSheet
        visible={action !== null}
        title={
          action?.mode === "manage"
            ? "Category actions"
            : action?.category
              ? "Edit category"
              : "New category"
        }
        subtitle={
          action?.mode === "manage"
            ? action.category?.name
            : `Adding to ${area?.name || "this area"}`
        }
        onClose={close}
        busy={busy}
      >
        {action?.mode === "manage" ? (
          <>
            <PrimaryButton
              variant="text"
              title="Edit"
              onPress={() => form(action.category)}
            />
            <PrimaryButton
              variant="text"
              title="Set as default"
              disabled={busy || action.category?.isDefault}
              onPress={async () => {
                if (!action.category) return;
                setBusy(true);
                try {
                  await p.onSetDefaultCategory(action.category.id);
                  setAction(null);
                  p.onSaved?.();
                } catch {
                  setError("Could not set the default category.");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <PrimaryButton
              variant="text"
              title="Archive"
              disabled={busy}
              onPress={() => {
                if (action.category) archive(action.category);
              }}
            />
          </>
        ) : (
          <>
            <Text style={s.body}>Category name</Text>
            <AppTextInput
              style={{ marginBottom: 0 }}
              accessibilityLabel="Category name"
              placeholder="Category name"
              value={draftName}
              onChangeText={(value) => {
                setDraftName(value);
                setError("");
                if (!action?.category) p.onNewCategoryNameChange(value);
              }}
              autoFocus
            />
            {error ? (
              <Text accessibilityRole="alert" style={{ color: t.danger }}>
                {error}
              </Text>
            ) : null}
            <Text style={s.body}>Category type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {types.map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="radio"
                  accessibilityLabel={
                    type.charAt(0).toUpperCase() + type.slice(1)
                  }
                  accessibilityState={{ checked: draftType === type }}
                  aria-checked={draftType === type}
                  onPress={() => {
                    setDraftType(type);
                    if (!action?.category) p.onNewCategoryTypeChange(type);
                  }}
                  style={{
                    width: "47%",
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: draftType === type ? t.pressed : t.border,
                    backgroundColor: draftType === type ? t.tint : t.card,
                  }}
                >
                  <Text
                    style={[
                      s.body,
                      { color: draftType === type ? t.tealText : t.text },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={s.body}>Require a receipt</Text>
              <Switch
                accessibilityLabel="Require a receipt"
                disabled={!p.canRequireReceipts && !required}
                value={required}
                onValueChange={(value) => {
                  setRequired(value);
                  if (!action?.category)
                    p.onNewCategoryRequiresReceiptChange(value);
                }}
                trackColor={{ false: t.border, true: t.pressed }}
              />
            </View>
            {!p.canRequireReceipts && (
              <Text style={s.helper}>
                Upgrade to Premium to require receipts. Existing requirements
                can be turned off.
              </Text>
            )}
            <PrimaryButton
              title={action?.category ? "Save changes" : "Add category"}
              loading={busy}
              onPress={() => void save()}
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
          onPress={close}
          disabled={busy}
        />
      </SettingsSheet>
    </View>
  );
}
