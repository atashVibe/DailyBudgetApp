import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import PrimaryButton from "../components/PrimaryButton";

export default function JoinFamilyScreen() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  const handleJoinFamily = async () => {
    console.log("Join Family button pressed");
    setMessage("Button works. Code entered: " + code);
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Join Family
      </Text>

      <Text style={{ marginBottom: 8 }}>Enter invite code:</Text>

      <TextInput
        value={code}
        onChangeText={(text) =>
          setCode(text.replace(/[^0-9]/g, "").slice(0, 6))
        }
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      {code.length === 6 && (
        <PrimaryButton title="Join Family" onPress={handleJoinFamily} />
      )}
      {message.length > 0 && (
        <Text style={{ marginTop: 20, color: "green" }}>{message}</Text>
      )}
    </View>
  );
}
