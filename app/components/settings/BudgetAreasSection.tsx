import { Alert, Text, TextInput, View } from "react-native";
import type { BudgetArea } from "../../../services/budgetAreas";
import PrimaryButton from "../PrimaryButton";

type Props = {
  budgetAreas: BudgetArea[];
  newBudgetAreaName: string;
  isAdmin: boolean;
  onNewBudgetAreaNameChange: (value: string) => void;
  onAddBudgetArea: () => void;
  onArchiveBudgetArea: (budgetAreaId: string) => void;
};

export default function BudgetAreasSection({
  budgetAreas,
  newBudgetAreaName,
  isAdmin,
  onNewBudgetAreaNameChange,
  onAddBudgetArea,
  onArchiveBudgetArea,
}: Props) {
  const handleConfirmArchive = (budgetAreaId: string) => {
    Alert.alert(
      "Archive Budget Area",
      "Archive hides this budget area from normal use and future entries. Existing entries and reports will remain saved.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => onArchiveBudgetArea(budgetAreaId),
        },
      ],
    );
  };
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        Budget Areas
      </Text>

      {budgetAreas.map((area) => (
        <View
          key={area.id}
          style={{
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 10,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>{area.name}</Text>

          {isAdmin && (
            <View style={{ marginTop: 10 }}>
              <PrimaryButton
                title="Archive"
                onPress={() => handleConfirmArchive(area.id)}
              />
            </View>
          )}
        </View>
      ))}

      {isAdmin && (
        <View style={{ marginTop: 12 }}>
          <TextInput
            value={newBudgetAreaName}
            onChangeText={onNewBudgetAreaNameChange}
            placeholder="New budget area name"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          />

          <PrimaryButton title="Add Budget Area" onPress={onAddBudgetArea} />
        </View>
      )}
    </View>
  );
}
