import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { uiTokens } from "./dashboardStyles";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

const AppScreen = React.forwardRef<ScrollView, Props>(function AppScreen(
  { children, style },
  ref,
) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: uiTokens.page }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            {
              flexGrow: 1,
              padding: 24,
              paddingBottom: 48,
              width: "100%",
              maxWidth: 960,
              alignSelf: "center",
            },
            style,
            { backgroundColor: uiTokens.page },
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

export default AppScreen;
