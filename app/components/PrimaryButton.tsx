import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

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
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.button, isDisabled && styles.disabledButton]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,

    backgroundColor: "#2bcea6",

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  text: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "600",
  },
});
