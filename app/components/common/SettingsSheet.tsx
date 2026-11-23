import { useRef } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  PanResponder,
} from "react-native";
import Text from "./AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { uiTokens as t, uiStyles as s } from "./dashboardStyles";
export default function SettingsSheet({
  visible,
  title,
  subtitle,
  children,
  onClose,
  busy = false,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const { width } = useWindowDimensions(),
    wide = width >= 768;
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 60 && !latest.current.busy) latest.current.onClose();
      },
    }),
  ).current;
  return (
    <Modal
      visible={visible}
      transparent
      animationType={wide ? "fade" : "slide"}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "rgba(17,24,39,0.5)",
          justifyContent: wide ? "center" : "flex-end",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            width: "100%",
            maxWidth: 480,
            alignSelf: "center",
            maxHeight: "90%",
          }}
        >
          <View
            role="dialog"
            aria-modal={true}
            accessibilityLabel={title}
            accessibilityViewIsModal
            style={{
              maxHeight: "100%",
              backgroundColor: t.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: t.border,
            }}
          >
            {!wide && (
              <View
                {...drag.panHandlers}
                style={{
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    height: 4,
                    width: 36,
                    borderRadius: 2,
                    backgroundColor: t.border,
                  }}
                />
              </View>
            )}
            <ScrollView
              style={{ flexShrink: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
            >
              <Text accessibilityRole="header" style={s.heading}>
                {title}
              </Text>
              {subtitle ? <Text style={s.helper}>{subtitle}</Text> : null}
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
