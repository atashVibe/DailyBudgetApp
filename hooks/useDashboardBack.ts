import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { useDrawerStatus } from "@react-navigation/drawer";
import { DrawerActions } from "@react-navigation/native";
import { useRequestSignOut } from "../components/SignOutConfirmation";
import { auth } from "../services/auth";

import { dashboardBackGuardKey as guardKey } from "../services/dashboardHistory";

// Guard only the focused dashboard. Other screens keep their normal Back action.
export function useDashboardBack() {
  const requestSignOut = useRequestSignOut();
  const drawerStatus = useDrawerStatus();
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      if (!auth.currentUser) return;
      if (Platform.OS !== "web") {
        const listener = BackHandler.addEventListener(
          "hardwareBackPress",
          () => {
            if (drawerStatus === "open") return false;
            requestSignOut();
            return true;
          },
        );
        return () => listener.remove();
      }
      // Wait for the focused route's URL to settle: navigating from Settings
      // can focus Dashboard before React Navigation finishes its history change.
      let frame: number | undefined;
      let onBack: ((event: PopStateEvent) => void) | undefined;
      const arm = () => {
        if (
          !window.location.pathname.replace(/\/+$/, "").endsWith("/dashboard")
        ) {
          frame = window.requestAnimationFrame(arm);
          return;
        }
        const dashboardUrl = window.location.href;
        const restoreGuard = () =>
          window.history.pushState(
            { ...window.history.state, [guardKey]: "guard" },
            "",
            dashboardUrl,
          );
        if (window.history.state?.[guardKey] !== "guard") {
          window.history.replaceState(
            { ...window.history.state, [guardKey]: "before" },
            "",
            dashboardUrl,
          );
          restoreGuard();
        }
        onBack = (event: PopStateEvent) => {
          // Forward navigation and returning from another screen keep their
          // normal router behavior. Only our dashboard-exit entry is guarded.
          if (event.state?.[guardKey] !== "before") return;
          event.stopImmediatePropagation();
          restoreGuard();
          if (drawerStatus === "open")
            navigation.dispatch(DrawerActions.closeDrawer());
          else requestSignOut();
        };
        window.addEventListener("popstate", onBack, true);
      };
      frame = window.requestAnimationFrame(arm);
      return () => {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
        if (onBack) window.removeEventListener("popstate", onBack, true);
      };
    }, [requestSignOut, drawerStatus, navigation]),
  );
}
