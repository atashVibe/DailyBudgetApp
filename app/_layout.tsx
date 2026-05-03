import { DrawerItemList } from "@react-navigation/drawer";
import { signOut } from "firebase/auth";
import { Text, View } from "react-native";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { auth } from "../services/auth";

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
  const handleSignOut = async () => {
    await signOut(auth);
  };
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer
        screenOptions={{
          headerShown: true,
        }}
        drawerContent={(props) => {
          return (
            <View style={{ flex: 1, padding: 20 }}>
              <Text style={{ fontSize: 24, marginBottom: 20 }}>Menu</Text>

              {/* Default items */}
              <DrawerItemList {...props} />
              {/* Sign Out */}
              <View style={{ marginTop: 40 }}>
                <Text
                  style={{ color: "red", fontSize: 16 }}
                  onPress={handleSignOut}
                >
                  Sign Out
                </Text>
              </View>
            </View>
          );
        }}
      >
        <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />

        <Drawer.Screen name="settings" options={{ title: "Settings" }} />

        {/* Hide unwanted */}
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
