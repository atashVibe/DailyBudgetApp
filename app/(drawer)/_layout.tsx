import { DrawerItemList } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { signOut } from "firebase/auth";
import { Text, View } from "react-native";
import { auth } from "../../services/auth";

export default function DrawerLayout() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <Drawer
      screenOptions={{
        headerShown: true,
      }}
      drawerContent={(props) => {
        return (
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 24, marginBottom: 20 }}>Menu</Text>

            <DrawerItemList {...props} />

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
        name="invite-family"
        options={{
          drawerLabel: "Invite Family Member",
          title: "Invite Family Member",
        }}
      />

      <Drawer.Screen
        name="join-family"
        options={{
          drawerLabel: "Join Family",
          title: "Join Family",
        }}
      />
    </Drawer>
  );
}
