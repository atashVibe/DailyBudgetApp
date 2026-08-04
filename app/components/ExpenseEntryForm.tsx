import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useBudgetAreas } from "../../hooks/useBudgetAreas";
import { useCategories } from "../../hooks/useCategories";
import { auth } from "../../services/auth";
import { addEntry, updateEntry } from "../../services/entries";
import AppPicker from "./common/AppPicker";
import AppTextInput from "./common/AppTextInput";
import FormLabel from "./common/FormLabel";
import PrimaryButton from "./common/PrimaryButton";

type Entry = {
  id: string;
  amount: number;
  budgetAreaId?: string;
  categoryId?: string;
  note: string;
  date?: string;
};

type Props = {
  familyId: string;
  onEntrySaved?: () => void;
  entryToEdit?: Entry | null;
  onCancelEdit?: () => void;
  refreshSignal?: number;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeAmountInput(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const decimalPoint = cleaned.indexOf(".");

  if (decimalPoint === -1) return cleaned;

  const whole = cleaned.slice(0, decimalPoint);
  const decimals = cleaned
    .slice(decimalPoint + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return `${whole || "0"}.${decimals}`;
}

export default function ExpenseEntryForm({
  familyId,
  onEntrySaved,
  entryToEdit,
  onCancelEdit,
  refreshSignal,
}: Props) {
  const [amount, setAmount] = useState("");
  const [selectedBudgetAreaId, setSelectedBudgetAreaId] = useState("");
  const { budgetAreas } = useBudgetAreas(familyId);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const { categories, defaultCategory } = useCategories(
    familyId,
    selectedBudgetAreaId,
  );
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  useEffect(() => {
    if (budgetAreas.length === 0) return;

    const selectedAreaStillExists = budgetAreas.some(
      (area) => area.id === selectedBudgetAreaId,
    );

    if (!selectedBudgetAreaId || !selectedAreaStillExists) {
      const defaultArea = budgetAreas.find((area) => area.isDefault === true);

      setSelectedBudgetAreaId(defaultArea?.id ?? budgetAreas[0].id);
    }
  }, [budgetAreas, selectedBudgetAreaId]);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId("");
      return;
    }

    const selectedCategoryStillExists = categories.some(
      (category) => category.id === selectedCategoryId,
    );

    if (!selectedCategoryId || !selectedCategoryStillExists) {
      setSelectedCategoryId(defaultCategory?.id ?? categories[0].id);
    }
  }, [categories, defaultCategory, selectedCategoryId]);

  useEffect(() => {
    if (entryToEdit) {
      setAmount(String(entryToEdit.amount ?? ""));
      setSelectedBudgetAreaId(entryToEdit.budgetAreaId ?? "");
      setSelectedCategoryId(entryToEdit.categoryId ?? "");
      setNote(entryToEdit.note ?? "");
      setDate(
        entryToEdit.date
          ? entryToEdit.date.split("T")[0]
          : formatLocalDate(new Date()),
      );
    } else {
      setAmount("");
      setSelectedCategoryId("");
      setNote("");
      setDate(formatLocalDate(new Date()));
    }
  }, [entryToEdit]);

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

      const selectedCategory = categories.find(
        (item) => item.id === selectedCategoryId,
      );

      if (!selectedCategory) {
        setMessage("Please select a category");
        setTimeout(() => setMessage(""), 2000);
        return;
      }

      const entryData = {
        amount: parseFloat(amount),
        budgetAreaId: selectedBudgetAreaId,
        categoryId: selectedCategoryId,
        type: selectedCategory.type,
        note,
        date,
      };

      if (entryToEdit?.id) {
        await updateEntry(entryToEdit.id, entryData);
      } else {
        await addEntry({
          userId: user.uid,
          familyId,
          ...entryData,
        });
      }

      setMessage("Entry saved");

      setTimeout(() => {
        setMessage("");
        onEntrySaved?.();
      }, 1500);

      setAmount("");
      setNote("");
    } catch {
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
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 16 }}>
        {entryToEdit ? "Edit Entry" : "Add Entry"}
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <FormLabel>Budget Area</FormLabel>
          <AppPicker
            selectedValue={selectedBudgetAreaId}
            onValueChange={setSelectedBudgetAreaId}
            options={budgetAreas.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <FormLabel>Category</FormLabel>
          <AppPicker
            selectedValue={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
            options={categories.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
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
                height: 52,
                boxSizing: "border-box",
                border: "1px solid #ccc",
              },
            })
          ) : (
            <View
              style={{
                height: 52,
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 10,
                marginBottom: 16,
                backgroundColor: "#fff",
                justifyContent: "center",
              }}
            >
              <Text
                onPress={() => setShowDatePicker(true)}
                style={{ padding: 14, fontSize: 16, color: "#111" }}
              >
                {date}
              </Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <FormLabel>Amount</FormLabel>
          <View style={{ position: "relative" }}>
            <Text
              style={{
                position: "absolute",
                left: 14,
                top: 15,
                zIndex: 1,
                fontSize: 16,
                color: "#111827",
              }}
            >
              $
            </Text>
            <AppTextInput
              placeholder="0.00"
              keyboardType="decimal-pad"
              inputMode="decimal"
              value={amount}
              onChangeText={(value) => setAmount(sanitizeAmountInput(value))}
              onBlur={() => {
                if (amount && !Number.isNaN(Number(amount))) {
                  setAmount(Number(amount).toFixed(2));
                }
              }}
              style={{ paddingLeft: 30 }}
            />
          </View>
        </View>
      </View>

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
