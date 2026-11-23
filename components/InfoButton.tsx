import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet } from "react-native";
import { uiTokens } from "../app/components/common/dashboardStyles";

type Props = {
  label: string;
  hint?: string;
  expanded: boolean;
  onPress: () => void;
};

// Use this for every information action. Keep the approved Budget Overview
// appearance here rather than adding per-screen size, color or border overrides.
export default function InfoButton({ label, hint, expanded, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ expanded }}
      aria-expanded={expanded}
      hitSlop={14}
      onPress={onPress}
      style={styles.button}
    >
      <Ionicons
        name="information-circle-outline"
        size={20}
        color={uiTokens.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
