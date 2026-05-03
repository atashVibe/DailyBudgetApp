import "react-native-gesture-handler";
import "react-native-reanimated";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer>
        <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Drawer.Screen name="settings" options={{ title: "Settings" }} />
        <Drawer.Screen
          name="(tabs)"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="login"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="signup"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="modal"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="components/PrimaryButton"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="components/ExpenseEntryForm"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="components/BudgetSummaryCard"
          options={{ drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="components/RecentEntriesList"
          options={{ drawerItemStyle: { display: "none" } }}
        />
      </Drawer>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
