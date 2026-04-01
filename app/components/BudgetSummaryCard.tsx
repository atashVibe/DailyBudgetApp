import { Text, View } from "react-native";

export default function BudgetSummaryCard() {
  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#EAF9F1",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Budget Summary
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 6 }}>
        Today's allowed spending: $30.00
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 6 }}>
        Remaining monthly budget: $420.00
      </Text>

      <Text style={{ fontSize: 16, color: "#2E7D32" }}>
        Status: On track
      </Text>
    </View>
  );
}