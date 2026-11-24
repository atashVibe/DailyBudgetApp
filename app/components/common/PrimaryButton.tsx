import { useState } from "react";
import { ActivityIndicator, StyleSheet, Pressable } from "react-native";
import Text from "./AppText";
import { uiTokens } from "./dashboardStyles";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "text" | "danger";
};

export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: Props) {
  const isDisabled = disabled || loading;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        focused && styles.focused,
        variant === "text"
          ? styles.textButton
          : variant === "outline"
            ? styles.outlineButton
            : variant === "danger"
              ? styles.dangerButton
              : null,
        (pressed || hovered) && {
          backgroundColor:
            variant === "primary"
              ? uiTokens.tealText
              : variant === "danger"
                ? "#B91C1C"
                : uiTokens.tint,
        },
        isDisabled && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "text" || variant === "outline"
              ? uiTokens.tealText
              : "#4B5563"
          }
        />
      ) : (
        <Text
          style={[
            styles.text,
            (variant === "text" || variant === "outline") && {
              color: uiTokens.tealText,
            },
            isDisabled && { color: "#4B5563" },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,

    backgroundColor: uiTokens.button,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",
  },

  focused: {
    outlineColor: uiTokens.pressed,
    outlineStyle: "solid",
    outlineWidth: 2,
    outlineOffset: 2,
  },
  disabledButton: {
    backgroundColor: "#E5E7EB",
  },

  text: {
    color: "#FFFFFF",

    fontFamily: uiTokens.font,
    fontSize: 15,
    textAlign: "center",

    fontWeight: "600",
  },
  textButton: { backgroundColor: "transparent" },
  outlineButton: {
    backgroundColor: uiTokens.card,
    borderWidth: 1,
    borderColor: uiTokens.border,
  },
  dangerButton: { backgroundColor: uiTokens.danger },
});
