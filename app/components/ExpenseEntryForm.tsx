import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import {
  commitReceiptEntryDraft,
  deleteReceipt,
  getReceiptAccess,
  listReceipts,
  newReceiptEntryId,
  pickReceipt,
  receiptsConfigured,
  startReceiptEntryDraft,
  uploadReceipt,
  type ReceiptAccess,
  type ReceiptFile,
} from "../../services/receipts";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useBudgetAreas } from "../../hooks/useBudgetAreas";
import { useCategories } from "../../hooks/useCategories";
import { auth } from "../../services/auth";
import { addEntry, updateEntry } from "../../services/entries";
import AppPicker from "./common/AppPicker";
import AppTextInput from "./common/AppTextInput";
import FormLabel from "./common/FormLabel";
import { dashboardStyles as ui } from "./common/dashboardStyles";
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
  onEditReady?: () => void;
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
  onEditReady,
  refreshSignal,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!entryToEdit || collapsed || !onEditReady) return;
    const frame = requestAnimationFrame(onEditReady);
    return () => cancelAnimationFrame(frame);
  }, [entryToEdit, collapsed, onEditReady]);
  const [amount, setAmount] = useState("");
  const [selectedBudgetAreaId, setSelectedBudgetAreaId] = useState("");
  const { budgetAreas } = useBudgetAreas(familyId);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const {
    categories,
    defaultCategory,
    loading: categoriesLoading,
  } = useCategories(familyId, selectedBudgetAreaId);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(formatLocalDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [receiptAccess, setReceiptAccess] = useState<ReceiptAccess | null>(
    null,
  );
  const [existingReceiptId, setExistingReceiptId] = useState("");
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [showPremiumInfo, setShowPremiumInfo] = useState(false);
  const [accessLoading, setAccessLoading] = useState(receiptsConfigured);
  const [saving, setSaving] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const busy = useRef(false);
  const draft = useRef<{ id: string; familyId: string } | null>(null);
  const currentFamily = useRef(familyId);
  currentFamily.current = familyId;
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const requiresReceipt = selectedCategory?.requiresReceipt === true;
  const missingReceipt = requiresReceipt && !files.length && !existingReceiptId;
  useFocusEffect(
    useCallback(() => {
      let current = true;
      setReceiptAccess(null);
      setShowPremiumInfo(false);
      setAccessLoading(receiptsConfigured);
      if (receiptsConfigured)
        getReceiptAccess()
          .then((access) => {
            if (current && access.familyId === familyId)
              setReceiptAccess(access);
          })
          .catch((error) => {
            if (current) setMessage(error.message);
          })
          .finally(() => {
            if (current) setAccessLoading(false);
          });
      return () => {
        current = false;
      };
    }, [familyId]),
  );
  useEffect(() => {
    let current = true;
    setFiles([]);
    setExistingReceiptId("");
    draft.current = null;
    setMessage("");
    setReceiptsLoading(Boolean(entryToEdit?.id && receiptsConfigured));
    if (entryToEdit?.id && receiptsConfigured)
      listReceipts(entryToEdit.id)
        .then((receipts) => {
          if (current)
            setExistingReceiptId(
              receipts.find((receipt) => receipt.status === "ready")
                ?.receiptId || "",
            );
        })
        .catch((error) => {
          if (current) setMessage(error.message);
        })
        .finally(() => {
          if (current) setReceiptsLoading(false);
        });
    return () => {
      current = false;
    };
  }, [familyId, entryToEdit?.id]);
  const chooseAttachment = async () => {
    if (saving || choosing) return;
    setChoosing(true);
    setMessage("");
    try {
      const file = await pickReceipt("attachment");
      if (!file) return;
      if (file.size > (receiptAccess?.limits.maxFileBytes || 10 * 1024 * 1024))
        throw new Error(
          "Choose a receipt within your family's file-size limit.",
        );
      setFiles((current) => [...current, file]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not select a receipt.",
      );
    } finally {
      setChoosing(false);
    }
  };
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
      setCollapsed(false);
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
    if (
      busy.current ||
      choosing ||
      categoriesLoading ||
      (requiresReceipt && receiptsLoading)
    )
      return;
    if (!amount || !Number.isFinite(Number(amount))) {
      setMessage("Please enter a valid amount");
      return;
    }
    if (!selectedCategory) {
      setMessage("Please select a category");
      return;
    }
    if (missingReceipt) {
      setMessage("Attach a receipt before saving this category.");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setMessage("Please sign in again.");
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
    busy.current = true;
    setSaving(true);
    setMessage("");
    try {
      if (entryToEdit?.id) {
        for (const file of files)
          await uploadReceipt(file, entryToEdit.id, (percent) =>
            setUploadProgress(`Uploading ${file.name}: ${percent}%`),
          );
        const attached =
          receiptsConfigured && (requiresReceipt || files.length)
            ? (await listReceipts(entryToEdit.id)).find(
                (receipt) => receipt.status === "ready",
              )
            : undefined;
        if (requiresReceipt && !attached)
          throw new Error(
            "This category requires a receipt. Attach one before saving.",
          );
        if (
          currentFamily.current !== familyId ||
          auth.currentUser?.uid !== user.uid
        )
          throw new Error(
            "Your account or family changed. Return to the original family to finish this entry.",
          );
        await updateEntry(entryToEdit.id, {
          ...entryData,
          ...(attached ? { receiptId: attached.receiptId } : {}),
        });
      } else if (files.length || draft.current) {
        if (!draft.current || draft.current.familyId !== familyId)
          draft.current = { id: newReceiptEntryId(), familyId };
        const draftId = draft.current.id;
        const started = await startReceiptEntryDraft(familyId, draftId);
        if (!started.committed) {
          // Reconcile interrupted attempts so removing a selected file also removes its draft upload.
          const currentReceipts = await listReceipts(draftId);
          for (const receipt of currentReceipts) {
            if (
              receipt.status === "ready" &&
              !files.some((file) => file.requestId === receipt.uploadRequestId)
            )
              await deleteReceipt(receipt.receiptId);
          }
          for (const file of files) {
            if (
              currentReceipts.some(
                (receipt) =>
                  receipt.status === "ready" &&
                  receipt.uploadRequestId === file.requestId,
              )
            )
              continue;
            await uploadReceipt(file, draftId, (percent) =>
              setUploadProgress(`Uploading ${file.name}: ${percent}%`),
            );
          }
        }
        if (
          currentFamily.current !== familyId ||
          auth.currentUser?.uid !== user.uid
        )
          throw new Error(
            "Your account or family changed. Return to the original family to finish this entry.",
          );
        await commitReceiptEntryDraft(draftId, entryData);
      } else {
        await addEntry({ userId: user.uid, familyId, ...entryData });
      }
      setMessage("Entry saved");
      setAmount("");
      setNote("");
      setFiles([]);
      draft.current = null;
      onEntrySaved?.();
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 410)
        draft.current = null;
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save this entry. Your form is kept so you can retry.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
      setUploadProgress("");
    }
  };

  return (
    <View style={ui.card}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Toggle entry form"
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed(!collapsed)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: collapsed ? 0 : 16,
        }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#2BCEA6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={26} color="white" />
        </View>
        <Text style={[ui.title, { flex: 1 }]}>
          {entryToEdit ? "Edit Entry" : "Add Expense"}
        </Text>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={21}
          color="#24364E"
        />
      </TouchableOpacity>
      {!collapsed && (
        <>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <FormLabel icon="grid-outline">Budget Area</FormLabel>
              <AppPicker
                tall
                disabled={saving}
                selectedValue={selectedBudgetAreaId}
                onValueChange={setSelectedBudgetAreaId}
                options={budgetAreas.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
              />
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <FormLabel icon="pricetag-outline">Category</FormLabel>
              <AppPicker
                tall
                disabled={saving}
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
              <FormLabel icon="calendar-outline">Date</FormLabel>
              {Platform.OS === "web" ? (
                React.createElement("input", {
                  type: "date",
                  "aria-label": "Entry date",
                  disabled: saving,
                  value: date,
                  onChange: (e: any) => setDate(e.target.value),
                  style: {
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 10,
                    padding: "0 10px",
                    fontSize: 16,
                    marginBottom: 12,
                    backgroundColor: "#fff",
                    width: "100%",
                    height: 60,
                    minHeight: 60,
                    maxHeight: 60,
                    minWidth: 0,
                    maxWidth: "100%",
                    display: "block",
                    appearance: "none",
                    WebkitAppearance: "none",
                    color: "#111827",
                    boxSizing: "border-box",
                    border: "1px solid #ccc",
                  },
                })
              ) : (
                <View
                  style={{
                    height: 60,
                    borderWidth: 1,
                    borderColor: "#ccc",
                    borderRadius: 10,
                    marginBottom: 16,
                    backgroundColor: "#fff",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    onPress={() => {
                      if (!saving) setShowDatePicker(true);
                    }}
                    style={{ padding: 14, fontSize: 16, color: "#111" }}
                  >
                    {date}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <FormLabel icon="cash-outline">Amount</FormLabel>
              <View style={{ position: "relative" }}>
                <Text
                  style={{
                    position: "absolute",
                    left: 14,
                    top: 19,
                    zIndex: 1,
                    fontSize: 16,
                    color: "#111827",
                  }}
                >
                  $
                </Text>
                <AppTextInput
                  editable={!saving}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  value={amount}
                  onChangeText={(value) =>
                    setAmount(sanitizeAmountInput(value))
                  }
                  onBlur={() => {
                    if (amount && !Number.isNaN(Number(amount))) {
                      setAmount(Number(amount).toFixed(2));
                    }
                  }}
                  style={{ height: 60, paddingLeft: 30, marginBottom: 12 }}
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

          <FormLabel icon="document-text-outline">Note (optional)</FormLabel>
          <AppTextInput
            style={{
              height: 60,
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              marginBottom: 12,
            }}
            editable={!saving}
            placeholder="Optional note"
            value={note}
            onChangeText={setNote}
          />

          <View style={{ gap: 8, marginBottom: 12 }}>
            <View
              testID="receipt-heading-row"
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={{ fontSize: 15, color: "#172B44" }}>
                Receipt {requiresReceipt ? "(required)" : "(optional)"}
              </Text>
              {receiptAccess?.canUpload ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Attach receipt"
                  accessibilityHint={`Opens your device's photo and PDF picker. Up to ${receiptAccess.limits.maxReceiptsPerTransaction} receipts per entry.`}
                  onPress={() => void chooseAttachment()}
                  disabled={
                    saving ||
                    choosing ||
                    files.length >=
                      receiptAccess.limits.maxReceiptsPerTransaction
                  }
                  accessibilityState={{
                    disabled:
                      saving ||
                      choosing ||
                      files.length >=
                        receiptAccess.limits.maxReceiptsPerTransaction,
                    busy: choosing,
                  }}
                  style={{
                    alignSelf: "flex-start",
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#2BCEA6",
                    backgroundColor: "#ECFDF5",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity:
                      saving ||
                      choosing ||
                      files.length >=
                        receiptAccess.limits.maxReceiptsPerTransaction
                        ? 0.5
                        : 1,
                  }}
                >
                  <Ionicons name="attach-outline" size={24} color="#11735B" />
                </TouchableOpacity>
              ) : receiptAccess ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="About Premium receipt attachments"
                  accessibilityHint="Explains how to enable receipt attachments for your family."
                  onPress={() => setShowPremiumInfo((shown) => !shown)}
                  style={{
                    width: 40,
                    height: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 20,
                    backgroundColor: "#EFF6FF",
                    borderWidth: 1,
                    borderColor: "#93C5FD",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      color: "#1D4ED8",
                      fontWeight: "700",
                    }}
                  >
                    i
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {requiresReceipt && (
              <Text style={{ color: "#92400E" }}>
                This category requires a receipt before you can save.
              </Text>
            )}
            {existingReceiptId ? (
              <Text>A receipt is already attached to this entry.</Text>
            ) : null}
            {receiptsLoading ? <Text>Checking existing receipts…</Text> : null}
            {showPremiumInfo && receiptAccess && !receiptAccess.canUpload && (
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: "#1E40AF", lineHeight: 22 }}
              >
                To attach a receipt, upgrade your family to Premium.
              </Text>
            )}
            {!receiptAccess && (
              <Text>
                {accessLoading
                  ? "Checking receipt access…"
                  : "Receipt attachments are unavailable right now."}
              </Text>
            )}
            {files.map((file) => (
              <View
                key={file.requestId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    accessibilityLabel={file.name}
                  >
                    {file.name}
                  </Text>
                  <Text>Ready to save</Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Remove selected receipt ${file.name}`}
                  style={{
                    flexShrink: 0,
                    paddingVertical: 10,
                    paddingHorizontal: 4,
                  }}
                  disabled={saving}
                  onPress={() =>
                    setFiles((current) =>
                      current.filter(
                        (item) => item.requestId !== file.requestId,
                      ),
                    )
                  }
                >
                  <Text style={{ color: "#B91C1C" }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
            {files.length > 0 && (
              <Text>
                Selected receipts will upload when you save. Your entry is added
                to the budget after the uploads succeed.
              </Text>
            )}
            {uploadProgress ? (
              <Text accessibilityLiveRegion="polite">{uploadProgress}</Text>
            ) : null}
          </View>

          <View style={{ gap: 12 }}>
            <PrimaryButton
              title={entryToEdit ? "Update Entry" : "Save Entry"}
              onPress={handleSave}
              disabled={
                missingReceipt ||
                !selectedCategory ||
                categoriesLoading ||
                (requiresReceipt && receiptsLoading) ||
                choosing
              }
              loading={saving}
            />

            {entryToEdit && (
              <TouchableOpacity onPress={onCancelEdit} disabled={saving}>
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
                color: message === "Entry saved" ? "green" : "#B91C1C",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {message}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
