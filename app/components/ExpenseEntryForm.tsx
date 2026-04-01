import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { auth } from "../../services/auth";
import { addEntry } from "../../services/entries";
import PrimaryButton from "./PrimaryButton";

export default function ExpenseEntryForm({
  onEntrySaved,
}: {
  onEntrySaved?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("Groceries");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    try {
      const user = auth.currentUser;

      if (!user) {
        setMessage("User not logged in");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      await addEntry({
        userId: user.uid,
        amount: parseFloat(amount),
        type,
        category,
        note,
        date: new Date().toISOString(),
      });

      setMessage("Entry saved");

      setTimeout(() => {
        setMessage("");
        onEntrySaved?.();
      }, 1500);

      onEntrySaved?.();

      setAmount("");
      setNote("");
    } catch (error) {
      setMessage("Error saving entry");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 16,
        }}
      >
        Add Entry
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Amount</Text>
      <TextInput
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Type</Text>
      <TextInput
        placeholder="Expense"
        value={type}
        onChangeText={setType}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Category</Text>
      <TextInput
        placeholder="Groceries"
        value={category}
        onChangeText={setCategory}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Note</Text>
      <TextInput
        placeholder="Optional note"
        value={note}
        onChangeText={setNote}
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          padding: 14,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      <PrimaryButton title="Save Entry" onPress={handleSave} />

      {message ? (
        <Text
          style={{
            marginTop: 12,
            color: "green",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}