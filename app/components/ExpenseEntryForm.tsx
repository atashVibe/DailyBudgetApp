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
import { Platform, TouchableOpacity, View } from "react-native";
import Text from "./common/AppText";
import { useBudgetAreas } from "../../hooks/useBudgetAreas";
import { useCategories } from "../../hooks/useCategories";
import { auth } from "../../services/auth";
import { addEntry, updateEntry } from "../../services/entries";
import AppPicker from "./common/AppPicker";
import AppTextInput from "./common/AppTextInput";
import FormLabel from "./common/FormLabel";
import {
  dashboardStyles as ui,
  uiTokens as tokens,
} from "./common/dashboardStyles";
import PrimaryButton from "./common/PrimaryButton";
import InfoButton from "../../components/InfoButton";
import Toast from "./common/Toast";

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
  useEffect(() => {
    if (!entryToEdit || !onEditReady) return;
    const frame = requestAnimationFrame(onEditReady);
    return () => cancelAnimationFrame(frame);
  }, [entryToEdit, onEditReady]);
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
  const [amountError, setAmountError] = useState("");
  const [toast, setToast] = useState("");
  const dismissToast = useCallback(() => setToast(""), []);
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
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setAmountError("Enter an amount greater than zero.");
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
      setToast(entryToEdit ? "Entry updated" : "Entry added");
      setAmountError("");
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
    <View style={ui.card} testID="new-entry-card">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: tokens.button,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={22} color="white" />
        </View>
        <Text style={ui.title}>New entry</Text>
        {entryToEdit ? (
          <Text
            style={{
              fontSize: 12,
              color: tokens.tealText,
              backgroundColor: tokens.tint,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
            }}
          >
            Edit entry
          </Text>
        ) : null}
      </View>
      <View style={{ marginBottom: 16 }}>
        <FormLabel>Amount</FormLabel>
        <View style={{ position: "relative" }}>
          <Text
            style={{
              position: "absolute",
              left: 16,
              top: 0,
              lineHeight: 48,
              zIndex: 1,
              fontSize: 26,
              color: tokens.muted,
            }}
          >
            $
          </Text>
          <AppTextInput
            accessibilityLabel="Entry amount"
            editable={!saving}
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputMode="decimal"
            value={amount}
            onChangeText={(value) => {
              setAmount(sanitizeAmountInput(value));
              setAmountError("");
            }}
            onBlur={() => {
              if (amount && !Number.isNaN(Number(amount)))
                setAmount(Number(amount).toFixed(2));
            }}
            style={{
              height: 48,
              fontSize: 34,
              lineHeight: 42,
              paddingLeft: 40,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
              marginBottom: 0,
            }}
          />
        </View>
        {amountError ? (
          <Text
            accessibilityRole="alert"
            style={{ fontSize: 13, color: tokens.danger, marginTop: 6 }}
          >
            {amountError}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <FormLabel>Budget area</FormLabel>
          <AppPicker
            tall
            accessibilityLabel="Budget area"
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
          <FormLabel>Category</FormLabel>
          <AppPicker
            tall
            accessibilityLabel="Entry category"
            disabled={saving}
            selectedValue={selectedCategoryId}
            onValueChange={setSelectedCategoryId}
            options={categories.map((item) => ({
              label: item.name,
              value: item.id,
              type: item.type,
            }))}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginBottom: 12,
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <FormLabel>Date</FormLabel>
          {Platform.OS === "web" ? (
            React.createElement("input", {
              type: "date",
              "aria-label": "Entry date",
              disabled: saving,
              value: date,
              onChange: (e: any) => setDate(e.target.value),
              style: {
                borderRadius: 12,
                padding: "0 10px",
                fontSize: 16,
                fontFamily: tokens.font,
                backgroundColor: tokens.card,
                width: "100%",
                height: 48,
                minHeight: 48,
                maxHeight: 48,
                minWidth: 0,
                maxWidth: "100%",
                display: "block",
                appearance: "none",
                WebkitAppearance: "none",
                color: tokens.text,
                boxSizing: "border-box",
                border: `1px solid ${tokens.border}`,
                outlineColor: tokens.pressed,
              },
            })
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Entry date"
              disabled={saving}
              onPress={() => setShowDatePicker(true)}
              style={{
                height: 48,
                borderWidth: 1,
                borderColor: tokens.border,
                borderRadius: 12,
                backgroundColor: tokens.card,
                justifyContent: "center",
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ fontSize: 15 }}>
                {date === formatLocalDate(new Date()) ? "Today" : date}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            testID="receipt-heading-row"
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginBottom: 8,
              minHeight: 22,
            }}
          >
            <Text style={{ fontSize: 15 }}>Receipt</Text>
            {receiptAccess && !receiptAccess.canUpload ? (
              <InfoButton
                label="About Premium receipt attachments"
                hint="Explains how to enable receipt attachments for your family."
                expanded={showPremiumInfo}
                onPress={() => setShowPremiumInfo((shown) => !shown)}
              />
            ) : null}
          </View>
          {receiptAccess?.canUpload ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Attach receipt"
              accessibilityHint={`Opens your device's photo and PDF picker. Up to ${receiptAccess.limits.maxReceiptsPerTransaction} receipts per entry.`}
              onPress={() => void chooseAttachment()}
              disabled={
                saving ||
                choosing ||
                files.length >= receiptAccess.limits.maxReceiptsPerTransaction
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
                height: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: requiresReceipt ? tokens.pressed : tokens.border,
                backgroundColor: requiresReceipt ? tokens.tint : tokens.card,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                opacity:
                  saving ||
                  choosing ||
                  files.length >= receiptAccess.limits.maxReceiptsPerTransaction
                    ? 0.5
                    : 1,
              }}
            >
              <Ionicons
                name="attach-outline"
                size={20}
                color={tokens.tealText}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: tokens.tealText,
                  fontWeight: "500",
                }}
              >
                Attach
              </Text>
              {requiresReceipt ? (
                <Text style={{ fontSize: 12, color: tokens.tealText }}>
                  · Required
                </Text>
              ) : null}
            </TouchableOpacity>
          ) : (
            <View
              style={{
                minHeight: 48,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: requiresReceipt ? tokens.pressed : tokens.border,
                backgroundColor: requiresReceipt ? tokens.tint : tokens.card,
                justifyContent: "center",
                paddingHorizontal: 8,
              }}
            >
              <Text style={{ fontSize: 12, color: tokens.muted }}>
                {accessLoading
                  ? "Checking access…"
                  : requiresReceipt
                    ? "Required · Premium"
                    : "Premium attachments"}
              </Text>
            </View>
          )}
        </View>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="default"
          onChange={(_event: any, selectedDate?: Date) => {
            setShowDatePicker(false);
            if (selectedDate) setDate(formatLocalDate(selectedDate));
          }}
        />
      )}
      {requiresReceipt ? (
        <Text
          style={{ fontSize: 13, color: tokens.amberText, marginBottom: 8 }}
        >
          This category requires a receipt before you can save.
        </Text>
      ) : null}
      {existingReceiptId ? (
        <Text style={ui.detail}>
          A receipt is already attached to this entry.
        </Text>
      ) : null}
      {receiptsLoading ? (
        <Text style={ui.detail}>Checking existing receipts…</Text>
      ) : null}
      {showPremiumInfo && receiptAccess && !receiptAccess.canUpload ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: tokens.tealText, fontSize: 13, marginBottom: 8 }}
        >
          To attach a receipt, upgrade your family to Premium.
        </Text>
      ) : null}
      {!receiptAccess && !accessLoading ? (
        <Text style={ui.detail}>
          Receipt attachments are unavailable right now.
        </Text>
      ) : null}
      {files.map((file) => (
        <View
          key={file.requestId}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            width: "100%",
            minWidth: 0,
            marginBottom: 8,
          }}
        >
          <View style={{ flex: 1, flexShrink: 1, minWidth: 0 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              accessibilityLabel={file.name}
              style={{ fontSize: 13 }}
            >
              {file.name}
            </Text>
            <Text style={ui.detail}>Ready to save</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Remove selected receipt ${file.name}`}
            style={{
              flexShrink: 0,
              minHeight: 48,
              paddingHorizontal: 8,
              justifyContent: "center",
            }}
            disabled={saving}
            onPress={() =>
              setFiles((current) =>
                current.filter((item) => item.requestId !== file.requestId),
              )
            }
          >
            <Text style={{ color: tokens.danger, fontSize: 13 }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      {files.length > 0 ? (
        <Text style={[ui.detail, { marginBottom: 12 }]}>
          Selected receipts will upload when you save. Your entry is added to
          the budget after the uploads succeed.
        </Text>
      ) : null}
      {uploadProgress ? (
        <Text accessibilityLiveRegion="polite" style={ui.detail}>
          {uploadProgress}
        </Text>
      ) : null}
      <FormLabel>Note (optional)</FormLabel>
      <AppTextInput
        style={{ height: 48, marginBottom: 16 }}
        editable={!saving}
        placeholder="Optional note"
        value={note}
        onChangeText={setNote}
      />
      <PrimaryButton
        title={entryToEdit ? "Update entry" : "Add entry"}
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
      {entryToEdit ? (
        <PrimaryButton
          title="Cancel edit"
          variant="text"
          onPress={() => onCancelEdit?.()}
          disabled={saving}
        />
      ) : null}
      {message ? (
        <Text
          accessibilityRole="alert"
          style={{ marginTop: 12, color: tokens.danger, fontSize: 13 }}
        >
          {message}
        </Text>
      ) : null}
      <Toast inline message={toast} onDismiss={dismissToast} />
    </View>
  );
}
