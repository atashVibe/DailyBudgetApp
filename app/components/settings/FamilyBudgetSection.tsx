import { useState } from "react";
import { View, Pressable } from "react-native";
import Text from "../common/AppText";
import Ionicons from "@expo/vector-icons/Ionicons";
import PrimaryButton from "../common/PrimaryButton";
import AppTextInput from "../common/AppTextInput";
import { uiTokens as t, uiStyles as s } from "../common/dashboardStyles";
type Props = {
  dailyBudget: number;
  budgetInput: string;
  isAdmin: boolean;
  onBudgetInputChange: (value: string) => void;
  onUpdateBudget: () => void;
  onSaved?: () => void;
};
export default function FamilyBudgetSection({
  dailyBudget,
  budgetInput,
  isAdmin,
  onBudgetInputChange,
  onUpdateBudget,
  onSaved,
}: Props) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <View style={s.card}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <Text style={s.heading}>Daily budget</Text>
        {isAdmin && !editing && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit daily budget"
            onPress={() => {
              onBudgetInputChange(String(dailyBudget));
              setEditing(true);
              setError("");
            }}
            style={[s.row, { minHeight: 48, paddingHorizontal: 8, gap: 4 }]}
          >
            <Ionicons name="pencil-outline" size={18} color={t.tealText} />
            <Text style={[s.body, { color: t.tealText }]}>Edit</Text>
          </Pressable>
        )}
      </View>
      {editing ? (
        <>
          <Text style={s.helper}>Daily budget amount</Text>
          <AppTextInput
            style={{ marginBottom: 0 }}
            accessibilityLabel="Daily budget amount"
            value={budgetInput}
            onChangeText={onBudgetInputChange}
            keyboardType="decimal-pad"
            placeholder="Enter new daily budget"
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title="Save"
                loading={busy}
                onPress={async () => {
                  if (busy) return;
                  if (
                    !Number.isFinite(Number(budgetInput)) ||
                    Number(budgetInput) <= 0
                  ) {
                    setError("Enter an amount greater than zero.");
                    return;
                  }
                  setBusy(true);
                  setError("");
                  try {
                    await onUpdateBudget();
                    setEditing(false);
                    onSaved?.();
                  } catch {
                    setError("The budget could not be updated. Please retry.");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                variant="text"
                title="Cancel"
                disabled={busy}
                onPress={() => {
                  onBudgetInputChange("");
                  setEditing(false);
                  setError("");
                }}
              />
            </View>
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={{ color: t.danger }}>
              {error}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={[s.row, { alignItems: "baseline" }]}>
          <Text style={[s.pageTitle, { fontSize: 32, marginBottom: 0 }]}>
            ${Number(dailyBudget || 0).toFixed(2)}
          </Text>
          <Text style={s.helper}>per day</Text>
        </View>
      )}
      {!isAdmin && (
        <Text style={s.helper}>
          Only a family administrator can change this amount.
        </Text>
      )}
    </View>
  );
}
