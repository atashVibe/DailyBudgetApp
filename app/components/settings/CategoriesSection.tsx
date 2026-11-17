import { useState } from "react";
import CategoryIconLibrary from "../../../components/CategoryIconLibrary";
import { updateCategoryIcon } from "../../../services/categories";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Platform, Text, TextInput, View, Switch } from "react-native";
import type { BudgetArea } from "../../../services/budgetAreas";
import type { Category, CategoryType } from "../../../services/categories";
import AppPicker from "../common/AppPicker";
import PrimaryButton from "../common/PrimaryButton";

type Props = {
  budgetAreas: BudgetArea[];
  categories: Category[];
  selectedBudgetAreaId: string;
  newCategoryName: string;
  newCategoryType: CategoryType;
  newCategoryRequiresReceipt: boolean;
  onNewCategoryRequiresReceiptChange: (value: boolean) => void;
  onReceiptRequiredChange: (categoryId: string, value: boolean) => void;
  isAdmin: boolean;
  canRequireReceipts: boolean;
  onSelectedBudgetAreaIdChange: (value: string) => void;
  onNewCategoryNameChange: (value: string) => void;
  onNewCategoryTypeChange: (value: CategoryType) => void;
  onAddCategory: () => void;
  onArchiveCategory: (categoryId: string) => void;
  onEditCategory: (
    categoryId: string,
    currentName: string,
    currentType: CategoryType,
  ) => void;
  onSetDefaultCategory: (categoryId: string) => void;
};

const CATEGORY_TYPE_OPTIONS: { label: string; value: CategoryType }[] = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Refund", value: "refund" },
  { label: "Cashback", value: "cashback" },
];

export default function CategoriesSection({
  budgetAreas,
  categories,
  selectedBudgetAreaId,
  newCategoryName,
  newCategoryType,
  newCategoryRequiresReceipt,
  onNewCategoryRequiresReceiptChange,
  onReceiptRequiredChange,
  isAdmin,
  canRequireReceipts,
  onSelectedBudgetAreaIdChange,
  onNewCategoryNameChange,
  onNewCategoryTypeChange,
  onAddCategory,
  onArchiveCategory,
  onEditCategory,
  onSetDefaultCategory,
}: Props) {
  const [iconCategory, setIconCategory] = useState<string | null>(null);
  const [chosenIcons, setChosenIcons] = useState<Record<string, string>>({});
  const handleConfirmArchive = (categoryId: string) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Archive this category? Existing entries and reports will remain saved.",
      );

      if (confirmed) {
        onArchiveCategory(categoryId);
      }

      return;
    }

    Alert.alert(
      "Archive Category",
      "Archive hides this category from normal use and future entries. Existing entries and reports will remain saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => onArchiveCategory(categoryId),
        },
      ],
    );
  };

  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        Categories
      </Text>

      <Text style={{ marginBottom: 8 }}>Budget Area</Text>
      <AppPicker
        selectedValue={selectedBudgetAreaId}
        onValueChange={onSelectedBudgetAreaIdChange}
        options={budgetAreas.map((area) => ({
          label: area.name,
          value: area.id,
        }))}
      />

      {isAdmin && !canRequireReceipts && (
        <Text style={{ color: "#6B7280", marginBottom: 12 }}>
          Your family needs Premium receipt upload access to require receipts.
          Existing requirements can still be turned off.
        </Text>
      )}
      <CategoryIconLibrary
        visible={iconCategory !== null}
        onClose={() => setIconCategory(null)}
        onChoose={async (name) => {
          if (!isAdmin || !iconCategory) return;
          await updateCategoryIcon(iconCategory, name);
          setChosenIcons((current) => ({ ...current, [iconCategory]: name }));
        }}
      />
      {categories.map((category) => (
        <View
          key={category.id}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons
              name={
                (chosenIcons[category.id] ||
                  category.iconName ||
                  "pricetag-outline") as React.ComponentProps<
                  typeof Ionicons
                >["name"]
              }
              size={26}
              color="#149B7C"
            />
            {isAdmin && (
              <Text
                accessibilityRole="button"
                onPress={() => setIconCategory(category.id)}
                style={{ color: "#147F69" }}
              >
                Choose icon
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", marginTop: 6 }}>
            {category.name}
          </Text>

          <Text style={{ color: "#666", marginTop: 4 }}>
            Type: {category.type}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginVertical: 12,
            }}
          >
            <Text>
              {category.requiresReceipt
                ? "Receipt required"
                : "Receipt optional"}
            </Text>
            {isAdmin && (
              <Switch
                accessibilityLabel={`Require receipt for ${category.name}`}
                disabled={
                  !canRequireReceipts && category.requiresReceipt !== true
                }
                value={category.requiresReceipt === true}
                onValueChange={(value) =>
                  onReceiptRequiredChange(category.id, value)
                }
              />
            )}
          </View>
          {isAdmin && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Ionicons
                name={
                  category.isDefault ? "checkmark-circle" : "ellipse-outline"
                }
                size={24}
                color={category.isDefault ? "green" : "#666"}
                onPress={() => {
                  if (!category.isDefault) {
                    onSetDefaultCategory(category.id);
                  }
                }}
              />
              <Ionicons
                name="create-outline"
                size={22}
                color="#111"
                onPress={() =>
                  onEditCategory(category.id, category.name, category.type)
                }
              />

              <Ionicons
                name="archive-outline"
                size={22}
                color="red"
                onPress={() => handleConfirmArchive(category.id)}
              />
            </View>
          )}
        </View>
      ))}

      {isAdmin && (
        <View style={{ marginTop: 12 }}>
          <TextInput
            value={newCategoryName}
            onChangeText={onNewCategoryNameChange}
            placeholder="New category name"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          />

          <Text style={{ marginBottom: 8 }}>Category Type</Text>
          <AppPicker
            selectedValue={newCategoryType}
            onValueChange={(value) =>
              onNewCategoryTypeChange(value as CategoryType)
            }
            options={CATEGORY_TYPE_OPTIONS}
          />

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text>Require a receipt</Text>
            <Switch
              disabled={!canRequireReceipts}
              accessibilityLabel="Require receipt for new category"
              value={newCategoryRequiresReceipt}
              onValueChange={onNewCategoryRequiresReceiptChange}
            />
          </View>
          <PrimaryButton title="Add Category" onPress={onAddCategory} />
        </View>
      )}
    </View>
  );
}
