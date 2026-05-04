import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  mode: "start" | "join" | null;
  onSelect: (mode: "start" | "join") => void;
};

export default function ModeToggle({ mode, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => onSelect("start")}
        style={[
          styles.button,
          mode === "start" ? styles.active : styles.inactive,
          { marginRight: 5 },
        ]}
      >
        <Text style={{ color: mode === "start" ? "white" : "black" }}>
          Start Family
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onSelect("join")}
        style={[
          styles.button,
          mode === "join" ? styles.active : styles.inactive,
          { marginLeft: 5 },
        ]}
      >
        <Text style={{ color: mode === "join" ? "white" : "black" }}>
          Join Family
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  active: {
    backgroundColor: "#0cb48a",
  },
  inactive: {
    backgroundColor: "#eee",
  },
});
