import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Platform, Text, TextInput, View } from "react-native";
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
  isAdmin: boolean;
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
  isAdmin,
  onSelectedBudgetAreaIdChange,
  onNewCategoryNameChange,
  onNewCategoryTypeChange,
  onAddCategory,
  onArchiveCategory,
  onEditCategory,
}: Props) {
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
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {category.name}
          </Text>

          <Text style={{ color: "#666", marginTop: 4 }}>
            Type: {category.type}
          </Text>

          {isAdmin && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
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

          <PrimaryButton title="Add Category" onPress={onAddCategory} />
        </View>
      )}
    </View>
  );
}


