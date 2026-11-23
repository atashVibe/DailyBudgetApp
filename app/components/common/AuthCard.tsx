import type { ReactNode } from "react";
import { View } from "react-native";
import AppScreen from "./AppScreen";
import Text from "./AppText";
import { uiStyles as ui } from "./dashboardStyles";

export default function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <AppScreen style={{ justifyContent: "center" }}>
      <View
        style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 16 }}
      >
        <Text style={[ui.heading, { textAlign: "center" }]}>DailyBudget</Text>
        <View style={[ui.card, { marginBottom: 0, gap: 16 }]}>
          <Text
            accessibilityRole="header"
            style={[ui.pageTitle, { marginBottom: 0 }]}
          >
            {title}
          </Text>
          {children}
        </View>
      </View>
    </AppScreen>
  );
}
