import { useEffect } from "react";
import { Platform } from "react-native";
import { restartCloudConnection } from "../services/loading";
// Mobile browsers suspend background network channels. Resume without clearing
// authentication, unsaved forms, or pending Firestore writes.
export function useResumeConnection() {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    let hiddenAt = 0;
    const reconnect = () => {
      void restartCloudConnection().catch(() => {});
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= 30000) {
        hiddenAt = 0;
        reconnect();
      }
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
}
