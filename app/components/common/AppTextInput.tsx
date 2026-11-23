import React, { useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { uiTokens } from "./dashboardStyles";

export default function AppTextInput(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      {...{ dir: "auto" }}
      onFocus={(event) => {
        setFocused(true);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      placeholderTextColor="#6B7280"
      style={[
        styles.input,
        props.style,
        focused && { borderColor: uiTokens.primary, borderWidth: 2 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,

    height: 48,

    paddingHorizontal: 14,

    fontSize: 16,
    fontFamily: uiTokens.font,

    color: "#111827",

    backgroundColor: "#FFFFFF",

    marginBottom: 16,
  },
});
