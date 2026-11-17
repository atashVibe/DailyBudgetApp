import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { DrawerItem, DrawerItemList } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { onAuthStateChanged, signOut } from "firebase/auth";
import SignOutConfirmation, {
  useRequestSignOut,
} from "../../components/SignOutConfirmation";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { auth, db } from "../../services/auth";

export default function DrawerLayout() {
  return (
    <SignOutConfirmation>
      <DrawerNavigation />
    </SignOutConfirmation>
  );
}

function DrawerNavigation() {
  const router = useRouter();
  const requestSignOut = useRequestSignOut();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  useEffect(() => {
    let unsubscribeRole = () => {};
    const watchdog = setTimeout(() => setIsRoleLoaded(true), 15000);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(watchdog);
      unsubscribeRole();
      if (!user) {
        setIsAdmin(false);
        setIsRoleLoaded(true);
        router.replace("/login");
        return;
      }
      setIsRoleLoaded(true);
      unsubscribeRole = onSnapshot(
        doc(db, "users", user.uid),
        (snapshot) => {
          setIsAdmin(snapshot.exists() && snapshot.data().role === "admin");
          setIsRoleLoaded(true);
        },
        () => {
          setIsAdmin(false);
          setIsRoleLoaded(true);
        },
      );
    });
    return () => {
      clearTimeout(watchdog);
      unsubscribeAuth();
      unsubscribeRole();
    };
  }, [router]);

  const handleSwitchUser = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log("Google sign-out skipped:", error);
    }

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
            <DrawerItem label="Switch User" onPress={handleSwitchUser} />

            <View style={styles.signOutContainer}>
              <Text style={styles.signOutText} onPress={requestSignOut}>
                Sign Out
              </Text>
            </View>
          </View>
        );
      }}
    >
      <Drawer.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Drawer.Screen name="receipts" options={{ title: "Family Receipts" }} />

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
          drawerItemStyle: isAdmin ? undefined : { display: "none" },
        }}
      />

      <Drawer.Screen
        name="join-family"
        options={{
          drawerLabel: "Switch Family",
          title: "Switch Family",
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
