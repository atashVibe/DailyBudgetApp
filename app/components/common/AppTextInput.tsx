import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

export default function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#6B7280"
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,

    height: 52,

    paddingHorizontal: 14,

    fontSize: 16,

    color: "#111827",

    backgroundColor: "#FFFFFF",

    marginBottom: 16,
  },
});


