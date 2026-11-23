import { useEffect } from "react";
import { View } from "react-native";
import Text from "./AppText";
import { uiTokens as t, uiStyles as s } from "./dashboardStyles";
export default function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 24,
        start: 16,
        end: 16,
        padding: 12,
        borderRadius: 12,
        backgroundColor: t.tealText,
        zIndex: 100,
      }}
    >
      <Text style={[s.body, { color: "white" }]}>{message}</Text>
    </View>
  );
}
