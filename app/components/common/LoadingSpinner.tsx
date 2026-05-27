import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  message?: string;
};

export default function LoadingSpinner({ message = "Loading..." }: Props) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <ActivityIndicator size="large" color="#2E7D32" />

      <Text
        style={{
          marginTop: 12,
          fontSize: 16,
          color: "#555",
        }}
      >
        {message}
      </Text>
    </View>
  );
}
