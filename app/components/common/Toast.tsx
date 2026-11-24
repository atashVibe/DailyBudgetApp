import { useEffect } from "react";
import { View } from "react-native";
import Text from "./AppText";
import { uiTokens as t, uiStyles as s } from "./dashboardStyles";
export default function Toast({
  message,
  onDismiss,
  inline = false,
}: {
  message: string;
  onDismiss: () => void;
  inline?: boolean;
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
        position: inline ? "relative" : "absolute",
        bottom: inline ? undefined : 24,
        start: inline ? undefined : 16,
        end: inline ? undefined : 16,
        marginTop: inline ? 12 : undefined,
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
