import { ActivityIndicator, View } from "react-native";
import Text from "./AppText";
import { uiTokens as t, uiStyles as s } from "./dashboardStyles";
export default function LoadingSpinner({
  message = "Loading…",
}: {
  message?: string;
}) {
  return (
    <View
      accessibilityState={{ busy: true }}
      style={{
        flex: 1,
        backgroundColor: t.page,
        padding: 24,
        justifyContent: "center",
        gap: 16,
      }}
    >
      <View
        style={{
          height: 24,
          width: "55%",
          borderRadius: 8,
          backgroundColor: t.border,
        }}
      />
      {[0, 1].map((key) => (
        <View
          key={key}
          style={{
            height: 112,
            borderRadius: 12,
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.border,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              height: 16,
              width: "40%",
              borderRadius: 6,
              backgroundColor: t.border,
            }}
          />
          <View
            style={{
              height: 12,
              width: "80%",
              borderRadius: 6,
              backgroundColor: t.border,
            }}
          />
        </View>
      ))}
      <ActivityIndicator color={t.pressed} />
      <Text accessibilityLiveRegion="polite" style={s.helper}>
        {message}
      </Text>
    </View>
  );
}
