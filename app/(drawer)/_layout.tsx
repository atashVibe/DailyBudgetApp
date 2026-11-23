import {
  DrawerItem,
  DrawerItemList,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import { useRouter, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { onAuthStateChanged } from "firebase/auth";
import SignOutConfirmation, {
  useRequestSignOut,
} from "../../components/SignOutConfirmation";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { View, Image } from "react-native";
import Text from "../components/common/AppText";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  uiStyles as ui,
  uiTokens as tokens,
} from "../components/common/dashboardStyles";
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
  const segments = useSegments();
  const personalAccount = segments[segments.length - 1] === "account";
  const requestSignOut = useRequestSignOut();
  const [isAdmin, setIsAdmin] = useState(false);
  const [familyName, setFamilyName] = useState("Family");
  const [displayName, setDisplayName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isRoleLoaded, setIsRoleLoaded] = useState(false);
  useEffect(() => {
    let unsubscribeRole = () => {};
    let unsubscribeFamily = () => {};
    const watchdog = setTimeout(() => setIsRoleLoaded(true), 15000);
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      clearTimeout(watchdog);
      unsubscribeRole();
      unsubscribeFamily();
      setFamilyName("Family");
      if (!user) {
        setDisplayName("");
        setPhoto(null);
        setIsAdmin(false);
        setIsRoleLoaded(true);
        router.replace("/login");
        return;
      }
      setIsRoleLoaded(true);
      setDisplayName(user.displayName || user.email || "Your account");
      setPhoto(user.photoURL?.startsWith("https://") ? user.photoURL : null);
      unsubscribeRole = onSnapshot(
        doc(db, "users", user.uid),
        { includeMetadataChanges: true },
        (snapshot) => {
          setIsAdmin(snapshot.exists() && snapshot.data().role === "admin");
          setDisplayName(
            user.displayName ||
              snapshot.data()?.displayName ||
              user.email ||
              "Your account",
          );
          unsubscribeFamily();
          if (
            snapshot.exists() &&
            snapshot.data().activeFamilyId === null &&
            !snapshot.metadata.fromCache
          ) {
            setFamilyName("No family");
            if (!personalAccount) router.replace("/family-setup");
            return;
          }
          if (
            typeof snapshot.data()?.activeFamilyId === "string" &&
            snapshot.data()?.activeFamilyId
          )
            unsubscribeFamily = onSnapshot(
              doc(db, "families", snapshot.data()!.activeFamilyId),
              (family) => setFamilyName(family.data()?.name || "Family"),
              () => setFamilyName("Family"),
            );
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
      unsubscribeFamily();
    };
  }, [router, personalAccount]);

  if (!isRoleLoaded) {
    return null;
  }
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: tokens.card },
        headerTintColor: tokens.text,
        headerTitleStyle: {
          fontFamily: tokens.font,
          fontSize: 18,
          fontWeight: "600",
        },
        drawerActiveBackgroundColor: tokens.tint,
        drawerActiveTintColor: tokens.tealText,
        drawerInactiveTintColor: tokens.muted,
        drawerStyle: { backgroundColor: tokens.card },
        drawerItemStyle: { minHeight: 48, borderRadius: 12 },
        drawerLabelStyle: { fontFamily: tokens.font, fontSize: 15 },
        overlayColor: "rgba(17,24,39,0.5)",
        drawerType: "front",
      }}
      drawerContent={(props) => {
        return (
          <DrawerContentScrollView
            {...props}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ padding: 16, gap: 12, marginBottom: 16 }}>
              <Text style={ui.heading} {...{ dir: "auto" }}>
                {familyName}
              </Text>
              <View style={ui.row}>
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={{ width: 44, height: 44, borderRadius: 22 }}
                  />
                ) : (
                  <View style={[ui.iconTile, { borderRadius: 22 }]}>
                    <Text style={ui.badgeText}>
                      {displayName
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => Array.from(part)[0])
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={[ui.name, { flex: 1 }]} {...{ dir: "auto" }}>
                  {displayName}
                </Text>
              </View>
            </View>
            <DrawerItemList {...props} />
            <View style={{ flex: 1 }} />
            <View
              style={[ui.divider, { marginHorizontal: 16, marginTop: 24 }]}
            />
            <DrawerItem
              label="Sign out"
              accessibilityLabel="Sign out"
              icon={({ size }) => (
                <Ionicons
                  accessible={false}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name="log-out-outline"
                  size={size}
                  color={tokens.danger}
                />
              )}
              labelStyle={{
                fontFamily: tokens.font,
                fontSize: 15,
                color: tokens.danger,
              }}
              onPress={requestSignOut}
            />
          </DrawerContentScrollView>
        );
      }}
    >
      <Drawer.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              aria-hidden={true}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="grid-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="receipts"
        options={{
          title: "Family receipts",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              aria-hidden={true}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="receipt-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="premium"
        options={{
          title: "Family Premium",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="receipt-storage"
        options={{
          title: "Receipt storage review",
          drawerItemStyle: { display: "none" },
        }}
      />

      <Drawer.Screen
        name="account"
        options={{
          title: "Account",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              aria-hidden={true}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="person-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: "Family settings",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              aria-hidden={true}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="settings-outline"
              color={color}
              size={size}
            />
          ),
          title: "Family settings",
        }}
      />

      <Drawer.Screen
        name="invite-family"
        options={{
          drawerLabel: "Invite family member",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              aria-hidden={true}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="person-add-outline"
              color={color}
              size={size}
            />
          ),
          title: "Invite family member",
          drawerItemStyle: isAdmin ? undefined : { display: "none" },
        }}
      />

      <Drawer.Screen
        name="join-family"
        options={{
          drawerLabel: "Switch family",
          drawerIcon: ({ color, size }) => (
            <Ionicons
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="swap-horizontal-outline"
              color={color}
              size={size}
            />
          ),
          title: "Switch family",
        }}
      />
    </Drawer>
  );
}
