import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, View } from "react-native";
import Text from "../app/components/common/AppText";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  uiStyles as ui,
  uiTokens as tokens,
} from "../app/components/common/dashboardStyles";
import {
  receiptsConfigured,
  getReceiptAccess,
  listReceipts,
  pickReceipt,
  uploadReceipt,
  deleteReceipt,
  openReceipt,
  exportAllReceipts,
  type Receipt,
  type ReceiptAccess,
  type ReceiptFile,
} from "../services/receipts";
import PrimaryButton from "../app/components/common/PrimaryButton";
import ReceiptStorage from "./ReceiptStorage";

export default function ReceiptPanel({
  transactionId,
}: {
  transactionId?: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<ReceiptAccess | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [retry, setRetry] = useState<{
    file: ReceiptFile;
    replaceId?: string;
  } | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!receiptsConfigured) return;
    const [nextAccess, nextReceipts] = await Promise.all([
      getReceiptAccess(),
      listReceipts(transactionId),
    ]);
    if (mounted.current) {
      setAccess(nextAccess);
      setReceipts(nextReceipts);
    }
  }, [transactionId]);
  useEffect(() => {
    setAccess(null);
    setReceipts([]);
    setMessage("");
    setRetry(null);
    refresh().catch((error) => {
      if (mounted.current) setMessage(error.message);
    });
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Receipt action failed. Please retry.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) {
        setWorking(false);
        setProgress(null);
      }
    }
  };
  const send = async (file: ReceiptFile, replaceId?: string) => {
    if (!transactionId || !access) return;
    if (file.size > access.limits.maxFileBytes)
      throw new Error(
        `Choose a file smaller than ${access.limits.maxFileBytes / 1e6} MB.`,
      );
    setRetry({ file, replaceId });
    setProgress(0);
    await uploadReceipt(
      file,
      transactionId,
      (value) => {
        if (mounted.current) setProgress(value);
      },
      replaceId,
    );
    setRetry(null);
    await refresh();
    setMessage("Original receipt saved.");
  };
  const choose = (kind: "camera" | "photo" | "pdf", replaceId?: string) =>
    run(async () => {
      const file = await pickReceipt(kind);
      if (file) await send(file, replaceId);
    });
  const remove = (receipt: Receipt) => {
    const action = () =>
      void run(async () => {
        await deleteReceipt(receipt.receiptId);
        await refresh();
        setMessage(
          "Receipt removal requested. Your budget entry is unchanged.",
        );
      });
    const warning =
      "Delete this original receipt? Your budget entry will remain. This cannot be undone through the app.";
    if (Platform.OS === "web") {
      if (window.confirm(warning)) action();
    } else
      Alert.alert("Delete receipt?", warning, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: action },
      ]);
  };
  if (!receiptsConfigured)
    return (
      <Text style={ui.body}>
        Receipts are currently unavailable. Your budget entries are still
        available.
      </Text>
    );
  return (
    <View style={{ gap: 12 }}>
      {!access && !message && (
        <View
          accessibilityLabel="Loading receipts"
          accessibilityState={{ busy: true }}
          style={[ui.card, { height: 112, backgroundColor: tokens.border }]}
        />
      )}
      <Text style={ui.body}>Receipts are shared with your current family.</Text>
      {access && (
        <>
          <Text style={ui.helper}>
            {access.canUpload
              ? "Receipt uploads are included for your family."
              : "Receipt uploads are available with Premium."}
          </Text>
          {!transactionId &&
            (access.limits.maxStorageBytes > 0 ||
              access.usage.liveBytes + access.usage.reservedBytes > 0) && (
              <ReceiptStorage access={access} />
            )}
          {access.deletionScheduledAt && (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: "#9A3412", fontSize: 16, lineHeight: 24 }}
            >
              Download your family receipts before{" "}
              {new Date(access.deletionScheduledAt).toLocaleDateString()}.
              Renewing the plan preserves receipts that have not already been
              removed. Budget entries remain.
            </Text>
          )}
          {transactionId && access.canUpload && (
            <>
              <Text>
                JPG, JPEG, PNG or PDF · up to {access.limits.maxFileBytes / 1e6}{" "}
                MB each · {access.limits.maxReceiptsPerTransaction} receipts per
                entry.
              </Text>
              <PrimaryButton
                variant="outline"
                title="Photograph a receipt"
                onPress={() => void choose("camera")}
                disabled={working}
              />
              <PrimaryButton
                variant="outline"
                title="Choose a photo"
                onPress={() => void choose("photo")}
                disabled={working}
              />
              <PrimaryButton
                variant="outline"
                title="Choose a PDF"
                onPress={() => void choose("pdf")}
                disabled={working}
              />
            </>
          )}
          {!transactionId && (
            <Text>
              To attach a receipt, use the paperclip beside a saved entry in
              this family.
            </Text>
          )}
          {(!(access.plan.startsWith("premium") && access.active) ||
            access.usage.liveBytes + access.usage.reservedBytes >=
              access.limits.maxStorageBytes ||
            access.downgradeUploadBlocked) && (
            <View style={{ gap: 8 }}>
              <PrimaryButton
                title="Upgrade family to Premium"
                onPress={() => router.push("/(drawer)/premium")}
              />
            </View>
          )}
          {access.plan.startsWith("premium") && access.active && (
            <PrimaryButton
              variant="text"
              title="Manage family subscription"
              onPress={() => router.push("/(drawer)/premium")}
            />
          )}
          {access.canRead && (
            <PrimaryButton
              variant="outline"
              title="Export family receipts (ZIP)"
              onPress={() => void run(exportAllReceipts)}
              disabled={working}
            />
          )}
        </>
      )}
      {progress !== null && (
        <Text accessibilityLiveRegion="polite">
          Upload: {progress}%
          {progress === 100 ? " — checking and saving your original…" : ""}
        </Text>
      )}
      {retry && !working && (
        <PrimaryButton
          title="Retry the same upload"
          onPress={() => void run(() => send(retry.file, retry.replaceId))}
        />
      )}
      {receipts.length === 0 && access && (
        <View style={[ui.card, { alignItems: "center", paddingVertical: 32 }]}>
          <View style={ui.iconTile}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={tokens.tealText}
            />
          </View>
          <Text style={ui.heading}>No receipts yet</Text>
          <Text style={ui.helper}>
            Your family’s receipts will appear here.
          </Text>
        </View>
      )}
      {receipts.map((receipt) => (
        <View
          key={receipt.receiptId}
          style={{
            gap: 10,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderTopColor: tokens.border,
            backgroundColor: tokens.card,
            borderWidth: 1,
            borderColor: tokens.border,
            borderRadius: 12,
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {receipt.originalFilename}
          </Text>
          <Text>
            {receipt.transactionDate || "Undated"} ·{" "}
            {(receipt.fileSize / 1024).toFixed(0)} KB ·{" "}
            {receipt.status === "deleting"
              ? "Removing receipt…"
              : "Original saved"}
          </Text>
          {receipt.status === "ready" && (
            <>
              {access?.canRead && (
                <>
                  <PrimaryButton
                    title="View original"
                    onPress={() => void run(() => openReceipt(receipt, true))}
                    disabled={working}
                  />
                  <PrimaryButton
                    variant="outline"
                    title="Download original"
                    onPress={() => void run(() => openReceipt(receipt))}
                    disabled={working}
                  />
                </>
              )}
              {transactionId && access?.canReplace && (
                <>
                  <PrimaryButton
                    variant="outline"
                    title="Replace with photo"
                    onPress={() => void choose("photo", receipt.receiptId)}
                    disabled={working}
                  />
                  <PrimaryButton
                    variant="outline"
                    title="Replace with PDF"
                    onPress={() => void choose("pdf", receipt.receiptId)}
                    disabled={working}
                  />
                </>
              )}
              <PrimaryButton
                variant="outline"
                title="Delete receipt"
                onPress={() => remove(receipt)}
                disabled={working}
              />
            </>
          )}
        </View>
      ))}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: "#374151", lineHeight: 24 }}
        >
          {message}
        </Text>
      ) : null}
      <PrimaryButton
        variant="outline"
        title="Refresh receipts"
        onPress={() => void run(refresh)}
        disabled={working}
      />
    </View>
  );
}
