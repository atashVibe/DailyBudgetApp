import { useColorScheme } from "@/hooks/use-color-scheme";
import { DrawerItemList } from "@react-navigation/drawer";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import "react-native-gesture-handler";
import "react-native-reanimated";
import { auth, db } from "../services/auth";

export default function RootLayout() {
  const [isAdmin, setIsAdmin] = useState(false);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      setIsAdmin(userData.role === "admin");
    });

    return unsubscribe;
  }, []);

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

        <Drawer.Screen
          name="Screens/InviteScreen"
          options={{
            drawerLabel: "Invite Family Member",
            title: "Invite Family Member",
          }}
        />

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
          name="Screens/signup"
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
        <Drawer.Screen
          name="join-family"
          options={{
            drawerLabel: "Join Family",
            title: "Join Family",
            drawerItemStyle: isAdmin ? { display: "none" } : undefined,
          }}
        />
      </Drawer>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
