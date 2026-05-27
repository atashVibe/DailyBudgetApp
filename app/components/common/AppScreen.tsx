import React from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ViewStyle,
} from "react-native";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function AppScreen({ children, style }: Props) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#ffffff" }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            flexGrow: 1,
            padding: 24,
          },
          style,
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


