import { Text, TouchableOpacity } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};
export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled || loading ? "#ccc" : "#0cb48a",
        padding: 14,
        borderRadius: 10,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: "white",
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        {loading ? "Loading..." : title}
      </Text>
    </TouchableOpacity>
  );
}
