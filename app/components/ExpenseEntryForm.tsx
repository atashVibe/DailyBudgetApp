import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { auth } from "../../services/auth";
import { getBudgetAreas } from "../../services/budgetAreas";
import { getCategories } from "../../services/categories";
import { addEntry, updateEntry } from "../../services/entries";
import { ENTRY_KIND_OPTIONS } from "../../services/entryKinds";
import AppPicker from "./AppPicker";
import AppTextInput from "./AppTextInput";
import FormLabel from "./FormLabel";
import PrimaryButton from "./PrimaryButton";

type Entry = {
  id: string;
  amount: number;
  type: string;
  category: string;
  note: string;
  date?: string;
};

type Props = {
  familyId: string;
  onEntrySaved?: () => void;
  entryToEdit?: Entry | null;
  onCancelEdit?: () => void;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ExpenseEntryForm({
  familyId,
  onEntrySaved,
  entryToEdit,
  onCancelEdit,
}: Props) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Expense");
  const [category, setCategory] = useState("Groceries");
  const [budgetAreas, setBudgetAreas] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedBudgetAreaId, setSelectedBudgetAreaId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (entryToEdit) {
      setAmount(String(entryToEdit.amount ?? ""));
      setType(entryToEdit.type ?? "Expense");
      setCategory(entryToEdit.category ?? "Groceries");
      setNote(entryToEdit.note ?? "");
      setDate(
        entryToEdit.date
          ? entryToEdit.date.split("T")[0]
          : formatLocalDate(new Date()),
      );
    } else {
      setAmount("");
      setType("Expense");
      setCategory("Groceries");
      setNote("");
      setDate(formatLocalDate(new Date()));
    }
  }, [entryToEdit]);
  useEffect(() => {
    const loadBudgetAreas = async () => {
      try {
        if (!familyId) return;

        const areas = await getBudgetAreas(familyId);

        setBudgetAreas(areas);

        if (areas.length > 0 && !selectedBudgetAreaId) {
          setSelectedBudgetAreaId(areas[0].id);
        }
      } catch (error) {
        console.log("Error loading budget areas:", error);
      }
    };

    loadBudgetAreas();
  }, [familyId]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (!familyId || !selectedBudgetAreaId) return;

        const loadedCategories = await getCategories(
          familyId,
          selectedBudgetAreaId,
        );

        setCategories(loadedCategories);

        if (loadedCategories.length > 0) {
          setSelectedCategoryId(loadedCategories[0].id);
          setCategory(loadedCategories[0].name);
        }
      } catch (error) {
        console.log("Error loading categories:", error);
      }
    };

    loadCategories();
  }, [familyId, selectedBudgetAreaId]);

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

      if (entryToEdit?.id) {
        await updateEntry(entryToEdit.id, {
          amount: parseFloat(amount),
          type,
          category,
          note,
          date,
        });
      } else {
        await addEntry({
          userId: user.uid,
          familyId,
          amount: parseFloat(amount),
          type,
          category,
          note,
          date,
        });
      }

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
        {entryToEdit ? "Edit Entry" : "Add Entry"}
      </Text>

      <FormLabel>Amount</FormLabel>
      <AppTextInput
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <FormLabel>Type</FormLabel>
      <AppPicker
        selectedValue={type}
        onValueChange={setType}
        options={ENTRY_KIND_OPTIONS}
      />

      <FormLabel>Budget Area</FormLabel>
      <AppPicker
        selectedValue={selectedBudgetAreaId}
        onValueChange={setSelectedBudgetAreaId}
        options={budgetAreas.map((item) => ({
          label: item.name,
          value: item.id,
        }))}
      />

      <FormLabel>Category</FormLabel>
      <AppPicker
        selectedValue={category}
        onValueChange={setCategory}
        options={
          categories.length > 0
            ? categories.map((item) => ({
                label: item.name,
                value: item.name,
              }))
            : [
                { label: "Groceries", value: "Groceries" },
                { label: "Transportation", value: "Transportation" },
                { label: "Bills", value: "Bills" },
                { label: "Medicine", value: "Medicine" },
              ]
        }
      />

      <FormLabel>Date</FormLabel>
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
              setDate(formatLocalDate(selectedDate));
            }
          }}
        />
      )}

      <FormLabel>Note</FormLabel>
      <AppTextInput
        placeholder="Optional note"
        value={note}
        onChangeText={setNote}
      />

      <View style={{ gap: 12 }}>
        <PrimaryButton
          title={entryToEdit ? "Update Entry" : "Save Entry"}
          onPress={handleSave}
        />

        {entryToEdit && (
          <TouchableOpacity onPress={onCancelEdit}>
            <Text
              style={{
                textAlign: "center",
                color: "#666",
                fontSize: 16,
                paddingVertical: 8,
              }}
            >
              Cancel Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
