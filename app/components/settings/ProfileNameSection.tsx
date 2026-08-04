import { StyleSheet, Text, View } from "react-native";
import AppTextInput from "../common/AppTextInput";
import PrimaryButton from "../common/PrimaryButton";

type Props = {
  name: string;
  message: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
};

export default function ProfileNameSection({
  name,
  message,
  onNameChange,
  onSave,
}: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Your Name</Text>
      <Text style={styles.help}>
        This is the name other members of your family will see.
      </Text>
      <AppTextInput
        value={name}
        onChangeText={onNameChange}
        placeholder="Enter your name"
        autoCapitalize="words"
        maxLength={80}
      />
      <PrimaryButton title="Save Name" onPress={onSave} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 20,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  help: { color: "#64748B", lineHeight: 20, marginBottom: 14 },
  message: { color: "#087F65", marginTop: 10, textAlign: "center" },
});
