import React from "react";
import { TextInput, TextInputProps } from "react-native";

export default function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#6B7280"
      style={[
        {
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
          color: "#111",
          backgroundColor: "#fff",
        },
        props.style,
      ]}
    />
  );
}
