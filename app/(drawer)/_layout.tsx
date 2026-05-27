import { DrawerItemList } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { auth, db } from "../../services/auth";

export default function DrawerLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  useEffect(() => {
    const loadUserRole = async () => {
      const user = auth.currentUser;

      if (!user) {
        setIsRoleLoaded(true);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setIsRoleLoaded(true);
        return;
      }

      setIsAdmin(userSnap.data().role === "admin");
      setIsRoleLoaded(true);
    };

    loadUserRole();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };
  if (!isRoleLoaded) {
    return null;
  }
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
      }}
      drawerContent={(props) => {
        return (
          <View style={styles.container}>
            <Text style={styles.menuTitle}>Menu</Text>

            <DrawerItemList {...props} />

            <View style={styles.signOutContainer}>
              <Text style={styles.signOutText} onPress={handleSignOut}>
                Sign Out
              </Text>
            </View>
          </View>
        );
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />

      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Family Settings",
          title: "Family Settings",
        }}
      />

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
          drawerItemStyle: isAdmin ? { display: "none" } : undefined,
        }}
      />
    </Drawer>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  menuTitle: {
    fontSize: 24,
    marginBottom: 20,
  },
  signOutContainer: {
    marginTop: 40,
  },
  signOutText: {
    color: "red",
    fontSize: 16,
  },
});
