import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
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
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      setMessage("Please enter a valid amount");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
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
        date,
      });

      setMessage("Entry saved");

      setTimeout(() => {
        setMessage("");
        onEntrySaved?.();
      }, 1500);

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
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          marginBottom: 16,
          overflow: "hidden",
        }}
      >
        <Picker
          selectedValue={type}
          onValueChange={(itemValue) => setType(itemValue)}
        >
          <Picker.Item label="Expense" value="Expense" />
          <Picker.Item label="Income" value="Income" />
          <Picker.Item label="Cashback" value="Cashback" />
          <Picker.Item label="Refund" value="Refund" />
          <Picker.Item label="Gift" value="Gift" />
        </Picker>
      </View>


      <Text style={{ fontSize: 16, marginBottom: 8 }}>Category</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 10,
          marginBottom: 16,
          overflow: "hidden"
        }}
      >
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
        >
          <Picker.Item label="Groceries" value="Groceries" />
          <Picker.Item label="Transportation" value="Transportation" />
          <Picker.Item label="Bills" value="Bills" />
          <Picker.Item label="Medicine" value="Medicine" />
        </Picker>
      </View>

      <Text style={{ fontSize: 16, marginBottom: 8 }}>Date</Text>

      {Platform.OS === "web" ? (
        React.createElement("input", {
          type: "date",
          value: date,
          onChange: (e: any) => setDate(e.target.value),
          style: {
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            padding: 14,
            fontSize: 16,
            marginBottom: 16,
            backgroundColor: "#fff",
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #ccc",
          },
        })
      ) : (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 10,
            marginBottom: 16,
            backgroundColor: "#fff",
          }}
        >
          <Text
            onPress={() => setShowDatePicker(true)}
            style={{
              padding: 14,
              fontSize: 16,
              color: "#111",
            }}
          >
            {date}
          </Text>
        </View>
      )}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="default"
          onChange={(_event: any, selectedDate?: Date) => {
            setShowDatePicker(false);

            if (selectedDate) {
              setDate(selectedDate.toISOString().split("T")[0]);
            }
          }}
        />
      )}

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