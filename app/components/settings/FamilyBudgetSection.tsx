import { Text, TextInput } from "react-native";
import PrimaryButton from "../common/PrimaryButton";

type Props = {
  dailyBudget: number;
  budgetInput: string;
  isAdmin: boolean;
  onBudgetInputChange: (value: string) => void;
  onUpdateBudget: () => void;
};

export default function FamilyBudgetSection({
  dailyBudget,
  budgetInput,
  isAdmin,
  onBudgetInputChange,
  onUpdateBudget,
}: Props) {
  return (
    <>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>
        Family Budget
      </Text>

      <Text style={{ marginBottom: 10 }}>
        Current Daily Budget: {dailyBudget}
      </Text>

      {isAdmin ? (
        <>
          <TextInput
            value={budgetInput}
            onChangeText={onBudgetInputChange}
            placeholder="Enter new daily budget"
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: "#ccc",
              padding: 10,
              borderRadius: 8,
              marginBottom: 10,
            }}
          />

          <PrimaryButton
            title="Update Family Daily Budget"
            onPress={onUpdateBudget}
          />
        </>
      ) : (
        <Text style={{ color: "#666", marginTop: 10 }}>
          Only the family admin can change the family budget.
        </Text>
      )}
    </>
  );
}


