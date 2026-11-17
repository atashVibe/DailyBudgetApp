import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import PrimaryButton from "../app/components/common/PrimaryButton";
const icons = Object.keys(Ionicons.glyphMap).filter((name) =>
  name.endsWith("-outline"),
);
export default function CategoryIconLibrary({
  visible,
  onClose,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  onChoose: (name: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: "#F5F9FF",
          padding: 24,
          paddingTop: 48,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          Choose a category icon
        </Text>
        <TextInput
          accessibilityLabel="Search category icons"
          placeholder="Search: cart, car, restaurant…"
          value={search}
          onChangeText={setSearch}
          style={{
            height: 60,
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 12,
            padding: 12,
            backgroundColor: "white",
          }}
        />
        {error ? <Text>{error}</Text> : null}
        <ScrollView>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {icons
              .filter((name) => name.includes(search.trim().toLowerCase()))
              .slice(0, 120)
              .map((name) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${name}`}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await onChoose(name);
                      onClose();
                    } catch {
                      setError("Could not save this icon. Please retry.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={{
                    width: 76,
                    alignItems: "center",
                    padding: 12,
                    gap: 6,
                    backgroundColor: "white",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#D9E5F1",
                  }}
                >
                  <Ionicons
                    name={name as React.ComponentProps<typeof Ionicons>["name"]}
                    size={28}
                    color="#149B7C"
                  />
                  <Text numberOfLines={2} style={{ fontSize: 10 }}>
                    {name.replace("-outline", "")}
                  </Text>
                </Pressable>
              ))}
          </View>
        </ScrollView>
        <PrimaryButton title="Close icon library" onPress={onClose} />
      </View>
    </Modal>
  );
}
